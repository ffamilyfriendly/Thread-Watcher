import { audit_service, channel_service, client, thread_service } from 'bot';
import {
  Channel,
  ChannelType,
  ChatInputCommandInteraction,
  GuildBasedChannel,
  Interaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';

import { Command, CommandError, PostExecutionTasks, RegistrationScope } from 'interfaces/Command';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import { make_advanced_embed, State } from 'commands/core/_shared/advanced_view';
import { create_channel_link } from './list';
import ThreadService from 'services/ThreadService';
import { map_err } from 'utilities/error';
import { CommandContext } from 'utilities/command_context';
import { PartialAuditObject } from 'services/AuditService';

async function fetch_all_threads_from_parent(channel: Channel) {
  let thread_list: ThreadChannel[] = [];

  if (channel.type === ChannelType.GuildCategory) {
    for (const child_of_channel of channel.children.cache.values()) {
      const child_of_channel_threads = await fetch_all_threads_from_parent(child_of_channel);

      if (child_of_channel_threads.isErr()) {
        console.log('ERROR', child_of_channel_threads.error);
        continue;
      }

      thread_list.push(...child_of_channel_threads.value);
    }
  } else if ('threads' in channel) {
    const active_threads_in_channel = await ResultAsync.fromPromise(
      channel.threads.fetchActive(),
      map_err,
    );

    const archived_threads_in_channel = await ResultAsync.fromPromise(
      channel.threads.fetchArchived(),
      map_err,
    );

    if (active_threads_in_channel.isErr()) return err(active_threads_in_channel.error);
    if (archived_threads_in_channel.isErr()) return err(archived_threads_in_channel.error);

    const threads_in_channel = [
      ...active_threads_in_channel.value.threads.values(),
      ...archived_threads_in_channel.value.threads.values(),
    ];

    thread_list.push(...threads_in_channel);
  }

  return ok(thread_list);
}

type BATCH_OPTIONS = 'WATCH' | 'UNWATCH' | 'TOGGLE';

const ALLOWED_CHANNEL_TYPES = [
  ChannelType.GuildCategory,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
];

interface ExecutionContext {
  action: BATCH_OPTIONS;
  watch_future: boolean;
}

const ACTION_AS_TEXT_LOOKUP_TABLE = {
  TOGGLE: 'toggled',
  WATCH: 'watched',
  UNWATCH: 'unwatched',
};

async function handle_execution(state: State, interaction: Interaction, context: ExecutionContext) {
  let threads_actioned = 0;

  const builder = audit_service
    .get_builder(interaction.guildId!, interaction.user.id, 'BATCH_ACTION')
    .with_timestamp()
    .set_reason(context.action)
    .set_target_ids(state.threads);

  for (const thread of state.threads) {
    const should_be_actioned = await ThreadService.should_be_watched(client, thread, state.filters);
    if (!should_be_actioned) continue;
    threads_actioned++;

    // TODO: handle cases where the thread_service returns err. We don't rn
    switch (context.action) {
      case 'WATCH':
        ResultAsync.fromPromise(thread_service.watch_thread(thread), map_err);
        break;
      case 'UNWATCH':
        ResultAsync.fromPromise(thread_service.unwatch_thread(thread), map_err);
        break;
      case 'TOGGLE':
        ResultAsync.fromPromise(thread_service.toggle_thread_watch_status(thread), map_err);
        break;
    }
  }

  const log = await builder.commit();

  if (log.isErr()) return state._ctx.err(log.error);
  const logged_events: PartialAuditObject[] = [log.value];

  if (context.watch_future) {
    ResultAsync.fromPromise(
      channel_service.add_channel(state.target_channel, state.filters),
      map_err,
    );

    const channel_monitor_log = await audit_service.log_event(
      'CHANNEL_MONITOR_START',
      interaction.guildId!,
      interaction.user.id,
      {
        target_id: state.target_channel.id,
        reason: JSON.stringify(state.filters),
        command_name: interaction.isCommand() ? interaction.commandName : 'batch',
      },
    );

    if (channel_monitor_log.isErr()) return state._ctx.err(channel_monitor_log.error);
    logged_events.push(channel_monitor_log.value);
  }

  state._ctx.send_audit(logged_events, interaction);
  state._ctx.ok();
}

function handle_cleanup(state: State, interaction: Interaction) {
  state.cleaner.clean();

  const cancelled_str = state._ctx.t('commands.batch.cancelled', {});
  if ('update' in interaction) {
    interaction.update({ components: [], content: cancelled_str });
    return;
  }

  if (interaction.isRepliable()) {
    if (interaction.replied) {
      interaction.editReply({ components: [], content: cancelled_str });
    } else {
      interaction.reply({ components: [], content: cancelled_str, ephemeral: true });
    }
  }
}

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const parent = interaction.options.getChannel('parent') || interaction.channel;

  const action: BATCH_OPTIONS =
    (interaction.options.getString('action') as BATCH_OPTIONS) ?? 'WATCH';

  const advanced = !!interaction.options.getBoolean('advanced');
  const watch_future = !!interaction.options.getBoolean('watch-future');

  if (!parent || !('guild' in parent) || !ALLOWED_CHANNEL_TYPES.includes(parent.type)) {
    return err(new Error('parent cannot hold threads'));
  }

  const waiting_embed = ctx.build_embed({
    title: ctx.t('commands.batch.fetching_title', {}),
    description: ctx.t('commands.batch.fetching_body', {
      channel_link: create_channel_link(parent),
    }),
    style: 'info',
  });

  const state: State<ExecutionContext> = {
    components: [],
    filters: {},
    edit_mode: false,
    threads: [],
    cleaner: new Vacuum(),
    target_channel: parent,
    _ctx: ctx,
    on_save: [handle_execution, { action, watch_future }],
    on_cleanup: handle_cleanup,
  };

  await interaction.reply({ embeds: [waiting_embed], flags: ['Ephemeral'] });
  const fetch_threads = await fetch_all_threads_from_parent(parent);

  if (fetch_threads.isErr()) return err(fetch_threads.error);
  state.threads = fetch_threads.value;

  if (advanced) {
    make_advanced_embed(interaction, state as State<unknown>);
  } else {
    handle_execution(state as State<unknown>, interaction, { action, watch_future });
  }

  const ms_10_minutes = 1000 * 60 * 10;
  const post_exec_tasks: PostExecutionTasks = {
    cleanup: {
      func: (int) => handle_cleanup(state as State<unknown>, int),
      cleanup_timing: ms_10_minutes,
    },
  };

  return ctx.get_execution_promise();
}

const command_data = new SlashCommandBuilder()
  .setName('batch')
  .setDescription(
    'Bulk-watch or unwatch threads in a channel/category using filters (regex, roles, tags)',
  )
  .addStringOption((opt) =>
    opt
      .setName('action')
      .setDescription('Choose what to do with the selected threads')
      .setChoices([
        { name: 'Watch Threads', value: 'WATCH' },
        { name: 'Unwatch Threads', value: 'UNWATCH' },
        { name: 'Toggle Watch Status', value: 'TOGGLE' },
      ])
      .setRequired(true),
  )
  .addChannelOption((o) =>
    o
      .setName('parent')
      .setDescription(
        'The channel/category containing threads to monitor (defaults to current channel)',
      )
      .addChannelTypes([
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      ]),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('watch-future')
      .setDescription('Automatically watch new threads created in this channel/category'),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('advanced')
      .setDescription('Use filters (regex, roles, tags) to selectively watch/unwatch threads'),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {
    invoker_requires_permission: [PermissionFlagsBits.ManageThreads],
    bot_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'parent',
  },
  command_data,
  run,
};

export default command;
