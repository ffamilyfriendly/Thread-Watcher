import { TypedPipelineModule } from '@watcher/shared';
import { DefaultModule, IPipeline, SupportedInteractionTypeWithGuild } from '../DefaultModule';
import { ValueContainer } from '../ValueContainter';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { generate_embed } from '../components/embed';
import { map_err } from '#/utilities/error';
import {
  ChannelType,
  ForumChannel,
  MediaChannel,
  Message,
  MessageCreateOptions,
  NewsChannel,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { thread_service } from '@providers/services/thread_service';
import { audit_service } from '@providers/services/audit_service';
import { get_action_row } from '../components/ticket_opened';

export default class OpenTicket extends DefaultModule<TypedPipelineModule<'OPEN_TICKET'>> {
  constructor(self: TypedPipelineModule<'OPEN_TICKET'>, pipeline: IPipeline) {
    const exports = new ValueContainer({}, self.id);
    super(self, pipeline, exports);
  }

  private async create_in_forum_channel(
    message: MessageCreateOptions,
    name: string,
    channel: ForumChannel | MediaChannel,
  ): Promise<Result<[ThreadChannel, Message], Error>> {
    const thread = await ResultAsync.fromPromise(
      channel.threads.create({
        message,
        name,
      }),
      map_err,
    );
    if (thread.isErr()) return err(thread.error);

    const starter_message = await ResultAsync.fromPromise(
      thread.value.fetchStarterMessage(),
      map_err,
    );
    if (starter_message.isErr()) return err(starter_message.error);
    if (!starter_message.value) return err(new Error('could not fetch starter message'));

    // For these types of threads that require a starter message the ID of the thread is the same as that of the starting message
    return ok([thread.value, starter_message.value]);
  }

  private async create_text_channel(
    message: MessageCreateOptions,
    name: string,
    channel: TextChannel | NewsChannel,
  ): Promise<Result<[ThreadChannel, Message], Error>> {
    let prom: Promise<ThreadChannel>;
    if (channel instanceof NewsChannel) {
      prom = channel.threads.create({
        name,
      });
    } else {
      const channel_type = this.self.private_thread
        ? ChannelType.PrivateThread
        : ChannelType.PublicThread;
      prom = channel.threads.create({
        name,
        type: channel_type,
      });
    }

    const thread = await ResultAsync.fromPromise(prom, map_err);
    if (thread.isErr()) return err(thread.error);

    const msg_res = await ResultAsync.fromPromise(thread.value.send(message), map_err);
    if (msg_res.isErr()) return err(msg_res.error);

    return ok([thread.value, msg_res.value]);
  }

  protected async run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>> {
    const embed = generate_embed(this.self.embed, this.pipeline.exports);

    const channel_res = await ResultAsync.fromPromise(
      interaction.guild.channels.fetch(this.pipeline.assigned_channel),
      map_err,
    );
    if (channel_res.isErr()) {
      this.l.error(
        `Could not fetch ticket parent channel with ID '${this.pipeline.assigned_channel}'`,
      );
      return err(channel_res.error);
    }
    if (!channel_res.value) {
      this.l.error(`channel with ID '${this.pipeline.assigned_channel}' was not found!`);
      return err(new Error(`channel with id '${this.pipeline.assigned_channel}' not found`));
    }
    const channel = channel_res.value;

    if (!('threads' in channel)) {
      const err_str = `Channel ${channel.name} (${channel.id}) cannot hold threads!`;
      this.l.error(err_str);
      return err(new Error(err_str));
    }

    const user_id = this.pipeline.get_property('env.user.id');

    const log_link = `https://cdn.threadwatcher.xyz/logs/${this.pipeline.get_property('env.ID')}_pipeline.txt`;

    const message: MessageCreateOptions = {
      embeds: [embed],
      components: [get_action_row(this.pipeline.ticket_id)],
      content: `> Ticket opened by <@${user_id}>\n> ${this.pipeline.assigned_roles.map((r) => `<@&${r}>`).join(', ')}\n-# Something went wrong? View the [(pipeline logs)](${log_link}).\n\n⚠️ **Note:** Ticket transcripts are currently unavailable.`,
    };
    const ticket_name = this.pipeline.ticket_name;
    const thread_channel_promise = await (channel.isThreadOnly()
      ? this.create_in_forum_channel(message, ticket_name, channel)
      : this.create_text_channel(message, ticket_name, channel));
    if (thread_channel_promise.isErr()) {
      this.l.error(`Could not create thread in ${channel.name} (${channel.id})`);
      return err(thread_channel_promise.error);
    }

    const [thread_channel, starter_message] = thread_channel_promise.value;

    if (this.pipeline.data.should_watch_ticket) {
      const could_watch_thread = await thread_service.watch_thread(thread_channel, {
        executor_id: interaction.user.id,
        guild_id: interaction.guildId,
        reason: `Ticket ${this.pipeline.ticket_id}`,
      });

      if (could_watch_thread.isErr()) {
        this.l.warn('could NOT watch ticket');
      } else this.l.info('watched ticket thread');
    }

    const could_start_ticket = await this.pipeline.start_ticket_with_thread(
      interaction,
      thread_channel,
      starter_message,
    );
    if (could_start_ticket.isErr()) return err(could_start_ticket.error);

    return ok();
  }
}
