import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result } from 'neverthrow';
import { map_err } from 'utilities/error';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { interpolate_string } from '../helpers/var_string';
import { ai_service } from '@providers/services/ai_service';
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  ModalBuilder,
  RepliableInteraction,
  TextInputStyle,
} from 'discord.js';
import { NarrowAnswer, IssueNarrower as Narrower } from 'services/AIWrappers/IssueNarrower';
import { ensure_deferred, safe_reply_or_followup, safe_update } from '../helpers/safe_reply';
import { config } from '@providers/config';
import { ValueContainer } from '../ValueContainter';
import { mistral_thinking_embed } from '../components/embed';

export default class IssueNarrower extends DefaultModule<TypedPipelineModule<'NARROW_ISSUE'>> {
  private narrowed_summary?: string;

  constructor(self: TypedPipelineModule<'NARROW_ISSUE'>, pipeline: IPipeline) {
    const exports = new ValueContainer(
      {
        issue: () => this.narrowed_summary ?? null,
      },
      self.rules ?? null,
    );

    super(self, pipeline, exports);
  }

  create_question_modal(question: string) {
    const m = new ModalBuilder();

    m.setTitle('Clarification');
    m.addTextDisplayComponents((td) => td.setContent(question));
    m.addLabelComponents((c) =>
      c
        .setLabel('Clarification')
        .setTextInputComponent((ti) =>
          ti.setStyle(TextInputStyle.Paragraph).setCustomId(this.self.uid),
        ),
    );

    return m;
  }

  private create_CTA_components(clarification_query: string): {
    proceed_button: ButtonBuilder;
    skip_button: ButtonBuilder;
    embed: EmbedBuilder;
  } {
    const embed = new EmbedBuilder();
    embed.setTitle('Clarification Requested');
    embed.setColor(config.style.info.colour as ColorResolvable);
    embed.setDescription(clarification_query);
    const clarify_button = new ButtonBuilder();
    clarify_button.setStyle(ButtonStyle.Primary);
    clarify_button.setLabel('Clarify');
    const skip_button = new ButtonBuilder();
    skip_button.setStyle(ButtonStyle.Secondary);
    skip_button.setLabel('Skip');

    return { proceed_button: clarify_button, skip_button, embed };
  }

  async create_end_embed(interaction: RepliableInteraction) {
    if (interaction instanceof ChatInputCommandInteraction) {
      return err(new Error('interaction was ChatInputCommandInteraction'));
    }

    const embed = super.get_themed_embed();
    embed.setTitle('Described issue');
    embed.setDescription(this.narrowed_summary ?? '<none generated>');
    embed.setFooter({ text: 'synthesized by AI' });

    return safe_update(interaction, {
      embeds: [embed],
      components: [],
    });
  }

  async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    const rules_subbed = interpolate_string(this.self.rules, this.pipeline.exports);
    const persona_subbd = interpolate_string(this.self.persona, this.pipeline.exports);

    const issue_narrower = ai_service.get_issue_narrower(
      interaction.guildId,
      persona_subbd,
      rules_subbed,
      this.pipeline.exports,
    );

    await safe_reply_or_followup(interaction, {
      flags: 'Ephemeral',
      embeds: [this.get_themed_embed(mistral_thinking_embed)],
    });

    const initial_response = await issue_narrower.narrow();
    if (initial_response.isErr()) {
      this.l.error('could not start issue narrowing conversation!');
      return err(map_err(initial_response.error));
    }

    this.narrowed_summary = initial_response.value.internal_summary;

    if (initial_response.value.is_clarified) {
      return ok();
    }

    let clarification_query = initial_response.value.clarification_query;

    let last_interaction: Interaction = interaction;
    for (let round = 0; round < this.self.max_responses; round++) {
      if (!clarification_query) return err(new Error("no 'clarification_query' was passed!"));

      const modal_res = await super.ensure_modal_shown(
        last_interaction,
        this.create_question_modal(clarification_query),
        { ...this.create_CTA_components(clarification_query), use_update_instead: true },
      );

      if (modal_res.isErr()) return err(modal_res.error);
      if (modal_res.value instanceof ButtonInteraction) {
        last_interaction = modal_res.value;
        this.l.silly(`User skipped AI narrowing on round ${round}/${this.self.max_responses}`);
        break;
      }
      last_interaction = modal_res.value;
      await safe_update(last_interaction, {
        embeds: [this.get_themed_embed(mistral_thinking_embed)],
        components: [],
      });

      const followup_clarification = modal_res.value.fields.getTextInputValue(this.self.uid);

      this.l.info(`user answered: ${followup_clarification}`);

      const followup_res = await issue_narrower.narrow(followup_clarification);
      if (followup_res.isErr()) return err(map_err(followup_res.error));

      this.narrowed_summary = followup_res.value.internal_summary;
      clarification_query = followup_res.value.clarification_query;

      if (followup_res.value.is_clarified) {
        break;
      }
    }

    await this.create_end_embed(last_interaction).then((r) => {
      if (r.isErr()) this.l.warn(`Could not update embed with narrowed issue`, r.error);
    });

    return ok(last_interaction as SupportedInteractionTypeWithGuild);
  }
}
