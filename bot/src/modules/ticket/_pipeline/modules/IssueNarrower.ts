import { TypedPipelineModule } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { interpolate_string } from '../helpers/var_string';
import { ai_service } from '@providers/services/ai_service';
import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  ModalBuilder,
  ModalSubmitInteraction,
  RepliableInteraction,
  TextInputStyle,
} from 'discord.js';
import { component_service } from '@providers/services/component_service';
import { NarrowAnswer, IssueNarrower as Narrower } from 'services/AIWrappers/IssueNarrower';
import { safe_reply, safe_reply_or_followup, safe_update } from '../helpers/safe_reply';
import { config } from '@providers/config';
import { Vacuum } from 'services/ComponentService';
import { ValueContainer } from '../ValueContainter';

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

  private async handle_followup(
    clarification_query: string,
    interaction: RepliableInteraction,
    ai: Narrower,
  ): Promise<
    Result<
      { should_skip: boolean; ai_res: NarrowAnswer | null; interaction: RepliableInteraction },
      Error
    >
  > {
    const embed = new EmbedBuilder();
    const action_row = new ActionRowBuilder<ButtonBuilder>();
    embed.setTitle('Clarification Requested');
    embed.setColor(config.style.info.colour as ColorResolvable);
    embed.setDescription(clarification_query);
    const clarify_button = new ButtonBuilder();
    clarify_button.setStyle(ButtonStyle.Primary);
    clarify_button.setLabel('Clarify');
    const skip_button = new ButtonBuilder();
    skip_button.setStyle(ButtonStyle.Secondary);
    skip_button.setLabel('Skip');

    const filter = (int: Interaction) => int.user.id === interaction.user.id;

    const vacuum = new Vacuum();

    return new Promise(async (resolve) => {
      const perr = (e: Error) => resolve(err(e));

      vacuum.add(
        component_service.wait_for_interaction_callback(
          clarify_button,
          filter,
          async (btn_int) => {
            const modal = this.create_question_modal(clarification_query);
            const modal_promise = component_service.wait_for_interaction(modal, filter);

            const show_modal = await ResultAsync.fromPromise(btn_int.showModal(modal), map_err);
            if (show_modal.isErr()) {
              this.l.error(`Could not show follow-up question to user`);
              return perr(show_modal.error);
            }
            const modal_response = await modal_promise;
            if (modal_response.isErr()) return perr(map_err(modal_response));

            const followup_clarification = modal_response.value.fields.getTextInputValue(
              this.self.uid,
            );

            this.l.info(`user answered: ${followup_clarification}`);

            const followup_res = await ai.narrow(followup_clarification);
            if (followup_res.isErr()) return perr(followup_res.error);

            vacuum.clean();
            return resolve(
              ok({
                should_skip: false,
                interaction: modal_response.value,
                ai_res: followup_res.value,
              }),
            );
          },
          undefined,
          () => perr(new Error('Timed out')),
        ),
        component_service.wait_for_interaction_callback(
          skip_button,
          filter,
          (btn_int) => {
            vacuum.clean();
            return resolve(
              ok({
                should_skip: true,
                interaction: btn_int,
                ai_res: null,
              }),
            );
          },
          undefined,
          () => perr(new Error('Timed out')),
        ),
      );

      action_row.addComponents([clarify_button, skip_button]);

      const embed_reply = await safe_reply_or_followup(interaction, {
        embeds: [embed],
        components: [action_row],
        flags: 'Ephemeral',
      });
      if (embed_reply.isErr()) return perr(embed_reply.error);
    });
  }

  async create_end_embed(interaction: RepliableInteraction) {
    if (interaction instanceof ChatInputCommandInteraction) {
      return err(new Error('interaction was ChatInputCommandInteraction'));
    }

    const embed = new EmbedBuilder();
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

    const initial_response = await issue_narrower.narrow();
    if (initial_response.isErr()) {
      this.l.error('could not start issue narrowing conversation!', initial_response.error.message);
      return err(initial_response.error);
    }

    this.narrowed_summary = initial_response.value.internal_summary;

    if (initial_response.value.is_clarified) {
      return ok();
    }

    let clarification_query = initial_response.value.clarification_query;

    let last_interaction: Interaction = interaction;
    for (let round = 0; round < this.self.max_responses; round++) {
      if (!clarification_query) return err(new Error("no 'clarification_query' was passed!"));
      this.l.info(`Asking user: ${clarification_query}`);
      const followup_res = await this.handle_followup(
        clarification_query,
        last_interaction,
        issue_narrower,
      );
      if (followup_res.isErr()) {
        this.l.error(`Could not get followup answer`, followup_res.error);
        return err(followup_res.error);
      }

      last_interaction = followup_res.value.interaction;

      if (followup_res.value.should_skip) {
        this.l.silly(`User skipped AI narrowing on round ${round}/${this.self.max_responses}`);
        break;
      }

      if (followup_res.value.ai_res) {
        this.narrowed_summary = followup_res.value.ai_res.internal_summary;
        clarification_query = followup_res.value.ai_res.clarification_query;
        if (followup_res.value.ai_res.is_clarified) break;
      }
    }

    await this.create_end_embed(last_interaction).then((r) => {
      if (r.isErr()) this.l.warn(`Could not update embed with narrowed issue`, r.error);
    });

    return ok(last_interaction as SupportedInteractionTypeWithGuild);
  }
}
