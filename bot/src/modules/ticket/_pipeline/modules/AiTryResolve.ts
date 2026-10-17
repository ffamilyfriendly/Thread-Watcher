import { TypedPipelineModule } from '@watcher/shared';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { ValueContainer } from '../ValueContainter';
import { MessageReciever } from '../../_defs';
import { ButtonBuilder, ChannelType, DMChannel, Message, PartialDMChannel } from 'discord.js';
import { add_dm_listener, remove_dm_listener } from '../../_on_message';
import { map_err } from '#/utilities/error';
import ConversationalAi from '#/services/AI/AIWrappers/Conversational';
import { ai_service } from '@providers/services/ai_service';
import { safe_defer, safe_reply_or_followup, safe_update } from '#/utilities/interaction_helpers';
import issue_resolver_agent from '#/services/AI/agents/TryResolve';
import { define_tool } from '#/services/AI/tools';
import {
  chat_terminated,
  create_handled_solution_message,
  create_opening_message,
  create_proposed_solution_message,
  show_cta_open_dm,
} from '../components/ai_try_resolve';
import { component_service } from '@providers/services/component_service';
import { ConversationInputs } from '@mistralai/mistralai/models/components';

type ResolveHookReturn = {
  exit_state: 'accepted_resolve' | 'declined_ai' | 'skip_ai' | 'convo_too_long';
  bailout_reason?: string;
};

export default class AiTryResolve
  extends DefaultModule<TypedPipelineModule<'AI_TRY_RESOLVE'>>
  implements MessageReciever
{
  private convo: ConversationalAi;
  private resolve_hook?: (args: ResolveHookReturn) => void;
  private msg_queue: {
    content: string;
    user_id: string;
    channel_id: string;
    message_id: string;
  }[] = [];
  private timeout?: NodeJS.Timeout;
  private dm_channel?: DMChannel | PartialDMChannel;
  private messages_sent: number = 0;
  private stop_responses = false;

  constructor(self: TypedPipelineModule<'AI_TRY_RESOLVE'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.id);
    super(self, pipeline, exports);

    this.convo = new ConversationalAi(ai_service, pipeline.data.guild_id);
  }

  async handle_message_queue() {
    if (this.messages_sent === this.self.max_rounds) {
      this.resolve_hook?.({ exit_state: 'convo_too_long' });
      return;
    }

    if (this.msg_queue.length === 0) return;
    const msgs: ConversationInputs = this.msg_queue.map((msg) => ({
      content: `<msg id=${msg.message_id} author_id=${msg.user_id}>${msg.content}</msg>`,
      role: 'user',
    }));
    this.msg_queue = [];

    const reply = await this.convo.followup({
      inputs: [
        ...msgs,
        {
          role: 'user',
          content:
            this.messages_sent === this.self.max_rounds
              ? `<usage>Agent has sent ${this.messages_sent}/${this.self.max_rounds} messages. You've 1 message left, please take action.</usage>`
              : `<usage>Agent has sent ${this.messages_sent}/${this.self.max_rounds} messages</usage>`,
        },
      ],
    });

    if (reply.isErr()) {
      this.l.error('AI failed to generate response to user!', reply.error);
      return;
    }

    if (typeof reply.value.content !== 'string') {
      this.l.error('AI returned in wrong format :(');
      return;
    }

    if (!this.dm_channel) {
      this.l.error('oops');
      return;
    }

    if (this.stop_responses) return;

    const reply_res = await ResultAsync.fromPromise(
      this.dm_channel.send({ content: reply.value.content }),
      map_err,
    );
    if (reply_res.isErr()) {
      this.l.error('could not send a reply :(', reply_res.error);
    }

    this.messages_sent += 1;
  }

  async on_message(msg: {
    content: string;
    user_id: string;
    channel_id: string;
    message_id: string;
  }) {
    if (this.timeout) clearTimeout(this.timeout);
    this.msg_queue.push(msg);
    setTimeout(() => this.handle_message_queue(), 1000);
    return ok();
  }

  private set_tools(interaction: SupportedInteractionTypeWithGuild) {
    const handoff = define_tool(
      {
        name: 'bailout',
        description:
          'CRITICAL: Call this tool immediately if human operator intervention is required. Use this if the user needs actions taken that you cannot perform (such as server moderation, bans, or applying roles), if the user explicitly demands to speak with a real human, or if you are stuck and unable to resolve the issue.',
        properties: {
          reason: {
            type: 'string',
            description:
              'Brief briefing or summary for human staff explaining why you are handing off.',
          },
        },
        required: ['reason'],
      },
      async (data, o) => {
        this.l.info(`AI called 'bailout' tool!`);
        this.resolve_hook?.({ exit_state: 'skip_ai', bailout_reason: data.reason });
        return ok('handed off!');
      },
    );

    const propose_solution = define_tool(
      {
        name: 'propose_solution',
        description:
          'Call this tool ONLY when you have gathered all necessary information and are fully confident you have a complete solution that can end the ticket right here and now (e.g. answering a server rules question). Do NOT call this if the user needs a human moderator or further assistance.',
        properties: {
          solution: {
            type: 'string',
            description:
              'The final, complete solution text to present to the user for confirmation.',
          },
          reason: {
            type: 'string',
            description:
              'Brief briefing or summary for human staff if your proposed solution is declined',
          },
        },
        required: ['solution'],
      },
      async (data, o) => {
        return new Promise((resolve) => {
          const r_err = (e: Error) => resolve(err(e));
          const r_ok = (a: unknown) => resolve(ok(a));

          if (!this.dm_channel) return err(new Error('no dm_channel set!'));

          this.l.info(`AI proposed solution:`, data.solution);
          const accept_btn = new ButtonBuilder();
          const reject_btn = new ButtonBuilder();

          component_service.wait_for_interaction_callback(
            accept_btn,
            (u) => u.user.id === interaction.user.id,
            (int) => {
              const msg = create_handled_solution_message(data.solution, true);
              int.update({ flags: 'IsComponentsV2', components: msg.components });
              this.pipeline.start_ticket_silently();
              this.resolve_hook?.({ exit_state: 'accepted_resolve' });
              r_ok('solution accepted');
            },
          );

          component_service.wait_for_interaction_callback(
            reject_btn,
            (u) => u.user.id === interaction.user.id,
            (int) => {
              const msg = create_handled_solution_message(data.solution, false);
              int.update({ flags: 'IsComponentsV2', components: msg.components });
              this.resolve_hook?.({ exit_state: 'declined_ai', bailout_reason: data.reason });
              r_ok('solution rejected');
            },
          );

          const msg = create_proposed_solution_message(data.solution, accept_btn, reject_btn);

          ResultAsync.fromPromise(
            this.dm_channel.send({ components: msg.components, flags: 'IsComponentsV2' }),
            map_err,
          ).then((r) => {
            if (r.isErr()) {
              this.l.error('Could not send DM to user :(', r.error);
              return r_err(r.error);
            }
          });
        });
      },
    );

    this.convo.add_tools([handoff, propose_solution]);
  }

  private async init_convo() {
    const system_prompt = `
    <persona>
    ${this.self.persona}
    </persona>
    <rules>
    ${this.self.rules}
    </rules>
    <variables>
    ${JSON.stringify(this.pipeline.exports.all())}
    </variables>
    `;

    return this.convo.open({ inputs: system_prompt }, issue_resolver_agent);
  }

  private wait_for_resolution(): Promise<ResolveHookReturn> {
    return new Promise((resolve) => {
      this.resolve_hook = async (p) => {
        const conversation_stop = await this.convo.delete_conversation();
        this.stop_responses = true;
        if (this.dm_channel) await remove_dm_listener(this.dm_channel.id);
        if (conversation_stop.isErr()) this.l.error('failed to stop conversation!');
        resolve(p);
      };
    });
  }

  protected async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    await safe_defer(interaction, { flags: 'Ephemeral' });

    this.set_tools(interaction);
    const opening_message = await this.init_convo();
    if (opening_message.isErr()) return err(opening_message.error);

    if (typeof opening_message.value.content !== 'string')
      return err(new Error('something went wrong'));

    const skip_ai_button = new ButtonBuilder();

    component_service.wait_for_interaction_callback(
      skip_ai_button,
      (u) => u.id === interaction.user.id,
      async (btn_int) => {
        await btn_int.reply(
          "Yeah I get it, you're also bored of AI everywhere. Letting you thru to the humans :)",
        );
        this.resolve_hook?.({ exit_state: 'skip_ai' });
      },
    );

    const { components } = create_opening_message(
      opening_message.value.content,
      skip_ai_button,
      this.pipeline.ticket_id,
      { guild_name: interaction.guild.name, guild_id: interaction.guildId },
    );

    const dm_channel = await ResultAsync.fromPromise(
      interaction.user.send({ components, flags: 'IsComponentsV2' }),
      map_err,
    );
    if (dm_channel.isErr()) {
      this.l.error('Failed to create a DM with the user', dm_channel.error);
      return err(dm_channel.error);
    }

    if (dm_channel.value.channel.isDMBased() && dm_channel.value.channel.type === ChannelType.DM)
      this.dm_channel = dm_channel.value.channel;

    const cta_comps = show_cta_open_dm(
      `https://discord.com/channels/@me/${dm_channel.value.channelId}/${dm_channel.value.id}`,
    );

    const cta_res = await safe_reply_or_followup(interaction, {
      flags: ['IsComponentsV2', 'Ephemeral'],
      components: cta_comps.components,
    });

    if (cta_res.isErr()) return err(cta_res.error);

    await add_dm_listener(this.pipeline.data.guild_id, dm_channel.value.channelId, this);

    this.l.info(
      `Entering DM conversation with ${interaction.user.username} (${interaction.user.id}). You will not see any message content in these logs for the sake of privacy.`,
    );

    const exit_args = await this.wait_for_resolution();

    this.exports.set('exit_state', exit_args.exit_state);
    if (exit_args.bailout_reason) {
      this.exports.set('brief', exit_args.bailout_reason);
    }
    this.l.info(`exited with state:`, exit_args);

    const exit = chat_terminated(
      `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`,
    );
    if (this.dm_channel && exit_args.exit_state !== 'accepted_resolve') {
      this.l.info('TRYING to send closing embed thing');
      const msg_res = await ResultAsync.fromPromise(
        this.dm_channel.send({ components: [exit], flags: 'IsComponentsV2' }),
        map_err,
      );

      if (msg_res.isErr()) {
        this.l.error(`Failed to send message`, msg_res.error);
      }
    }

    return ok(interaction);
  }
}
