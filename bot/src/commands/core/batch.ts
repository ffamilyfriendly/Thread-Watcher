import {
  AllowedThreadTypeForTextChannel,
  AnyThreadChannel,
  CategoryChannel,
  Channel,
  ChannelType,
  Guild,
  GuildBasedChannel,
  GuildChannel,
  GuildForumThreadManager,
  GuildTextThreadManager,
  Interaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';
import { GuildChatInteraction, RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, type Command } from '#/interfaces/Command';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Vacuum } from '#/services/ComponentService';
import { make_advanced_embed, State } from '#/commands/core/_shared/advanced_view';
import { create_channel_link } from './list';
import ThreadService from '#/services/ThreadService';
import { async_from, map_err, mapped_err } from '#/utilities/error';
import { AuditMeta } from '#/services/AuditService';
import { get_target } from './_shared/check_channel_values';
import { client } from '@providers/client';
import { thread_service } from '@providers/services/thread_service';
import { channel_service } from '@providers/services/channel_service';
import { CommandError } from '#/utilities/error/def';
import { safe_delete, safe_reply } from '#/utilities/interaction_helpers';
import { TKey } from '@generated/locales';
import { Logger } from 'tslog';

const MAX_PAGES_FETCHED_PER_CHANNEL = 5;

type ThreadMgr =
  | GuildTextThreadManager<ChannelType.AnnouncementThread>
  | GuildTextThreadManager<AllowedThreadTypeForTextChannel>
  | GuildForumThreadManager;

/**
 * @description Archived threads from a channel is fetched in pages, instead of in one go as active threads. This function will fetch multiple pages of archived threads, defined by the constant `MAX_PAGES_FETCHER_PER_CHANNEL`
 */
async function fetch_all_archived_threads_from_channel(threadmgr: ThreadMgr) {
  let before: string | undefined;

  let threads: AnyThreadChannel[] = [];

  for (let i = 0; i < MAX_PAGES_FETCHED_PER_CHANNEL; i++) {
    const fetched_threads = await async_from(threadmgr.fetchArchived({ limit: 100, before }));
    if (fetched_threads.isErr()) return mapped_err(fetched_threads.error);
    threads.push(...fetched_threads.value.threads.values());
    if (!fetched_threads.value.hasMore) break;
    before = fetched_threads.value.threads.last()?.id;
  }

  return ok(threads);
}

async function fetch_from_guild(guild: Guild, l: Logger<unknown>) {
  let thread_list: ThreadChannel[] = [];
  for (const child_channel of guild.channels.cache.values()) {
    const children_of_guild_threads = await fetch_all_threads_from_parent(child_channel, l);

    if (children_of_guild_threads.isErr()) {
      l.error(`could not get threads of guild`, {
        error: children_of_guild_threads.error,
        guild_id: guild.id,
      });
      continue;
    }

    thread_list.push(...children_of_guild_threads.value);
  }

  return ok(thread_list);
}

async function fetch_from_category(channel: CategoryChannel, l: Logger<unknown>) {
  let thread_list: ThreadChannel[] = [];
  for (const child_of_channel of channel.children.cache.values()) {
    const child_of_channel_threads = await fetch_all_threads_from_parent(child_of_channel, l);

    if (child_of_channel_threads.isErr()) {
      l.error('could not get threads of category', {
        error: child_of_channel_threads.error,
        guild_id: channel.guildId,
        channel_id: channel.id,
      });
      continue;
    }

    thread_list.push(...child_of_channel_threads.value);
  }

  return ok(thread_list);
}

async function fetch_from_channel(
  channel: GuildChannel & { threads: ThreadMgr },
  l: Logger<unknown>,
) {
  let thread_list: ThreadChannel[] = [];

  const active_threads_in_channel = await ResultAsync.fromPromise(
    channel.threads.fetchActive(),
    map_err,
  );

  const archived_threads_in_channel = await fetch_all_archived_threads_from_channel(
    channel.threads,
  );

  const threads_in_channel: AnyThreadChannel[] = [];

  active_threads_in_channel.match(
    (threads) => {
      threads_in_channel.push(...threads.threads.values());
    },
    (e) => {
      l.error('failed to fetch active threads', {
        error: e,
        channel_id: channel.id,
        guild_id: channel.guildId,
      });
    },
  );

  archived_threads_in_channel.match(
    (threads) => {
      threads_in_channel.push(...threads);
    },
    (e) => {
      l.error('failed to fetch archived threads', {
        error: e,
        channel_id: channel.id,
        guild_id: channel.guildId,
      });
    },
  );

  thread_list.push(...threads_in_channel);

  return ok(threads_in_channel);
}

async function fetch_all_threads_from_parent(channel: Channel | Guild, l: Logger<unknown>) {
  let thread_list: ThreadChannel[] = [];

  if (channel instanceof Guild) return fetch_from_guild(channel, l);

  if (channel.type === ChannelType.GuildCategory) {
    const r = await fetch_from_category(channel, l);
    if (r.isOk()) {
      thread_list.push(...r.value);
    }
  } else if ('threads' in channel) {
    const r = await fetch_from_channel(channel, l);
    if (r.isOk()) {
      thread_list.push(...r.value);
    }
  }

  return ok(thread_list);
}

type BATCH_OPTIONS = 'WATCH' | 'UNWATCH' | 'TOGGLE';

interface ExecutionContext {
  action: BATCH_OPTIONS;
  watch_future: boolean;
}

async function handle_execution(state: State, interaction: Interaction, context: ExecutionContext) {
  let results: ResultAsync<unknown, Error>[] = [];
  let actioned_threads: string[] = [];

  for (const thread of state.threads) {
    // Name is slightly missleading. This really only checks if the thread complies with our filters
    const should_be_actioned = await ThreadService.should_be_watched(client, thread, state.filters);
    if (should_be_actioned.isOk() && !should_be_actioned.value) continue;
    if (should_be_actioned.isErr()) return err(should_be_actioned.error);
    actioned_threads.push(thread.id);

    let res: ResultAsync<unknown, Error>;

    const audit: AuditMeta = {
      executor_id: interaction.user.id,
      guild_id: state.guild_id,
      reason: '/batch invoked',
    };

    switch (context.action) {
      case 'WATCH':
        res = ResultAsync.fromPromise(thread_service.watch_thread(thread, audit), map_err);
        break;
      case 'UNWATCH':
        res = ResultAsync.fromPromise(thread_service.unwatch_thread(thread, audit), map_err);
        break;
      case 'TOGGLE':
        res = ResultAsync.fromPromise(
          thread_service.toggle_thread_watch_status(thread, audit),
          map_err,
        );
        break;
    }

    results.push(res);
  }

  const result_thing = await ResultAsync.combineWithAllErrors(results);
  if (result_thing.isErr()) return err(result_thing.error);

  // TODO: look inte partial degradation here
  // a failure to add a monitor does not mean that the command failed outright
  if (context.watch_future) {
    const could_add_monitor = await channel_service.add_monitor(
      state.target_channel.id,
      state.guild_id,
      {
        executor_id: interaction.user.id,
        guild_id: state.guild_id,
        reason: "'watch-new' option on /batch",
      },
      state.filters,
    );

    if (could_add_monitor.isErr()) return err(could_add_monitor.error);
  }

  const ctx = state._ctx;
  const e = ctx.build_embed('success');
  e.setTitle(ctx.t('commands.batch.success_embed_title'));

  const lookup: Record<BATCH_OPTIONS, TKey> = {
    WATCH: 'commands.batch.action_watched',
    UNWATCH: 'commands.batch.action_unwatched',
    TOGGLE: 'commands.batch.action_toggled',
  };

  const action_name = ctx.t(lookup[context.action]);
  let desc = ctx.t('commands.batch.success_embed_body', {
    actioned_number: result_thing.value.length,
    action_name,
  });

  if (context.watch_future)
    desc += `\n\n-# ${ctx.t('commands.batch.success_embed_footer_monitor_enabled', {
      target_id: state.target_channel.id,
    })}`;

  e.setDescription(desc);

  if (!interaction.isRepliable()) return;
  return safe_reply(interaction, { embeds: [e], flags: 'Ephemeral' });
}

function handle_cleanup(state: State, interaction: Interaction) {
  state.cleaner.clean();
  if (!interaction.isRepliable()) return;
  return safe_delete(interaction);
}

async function run(
  interaction: GuildChatInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const parent = await get_target(interaction);
  if (parent.isErr()) {
    return err(parent.error);
  }

  const action: BATCH_OPTIONS =
    (interaction.options.getString('action') as BATCH_OPTIONS) ?? 'WATCH';

  const advanced = !!interaction.options.getBoolean('advanced');
  const watch_future = !!interaction.options.getBoolean('watch-future');

  const channel_link =
    parent.value instanceof Guild
      ? 'in this guild'
      : create_channel_link(parent.value as GuildBasedChannel);

  const waiting_embed = ctx.build_embed('info');
  waiting_embed.setTitle(ctx.t('commands.batch.fetching_title'));
  waiting_embed.setDescription(
    ctx.t('commands.batch.fetching_body', {
      channel_link,
    }),
  );

  const state: State<ExecutionContext> = {
    components: [],
    filters: {
      tags: null,
      role_whitelist: null,
      regex: undefined,
    },
    guild_id: interaction.guildId,
    edit_mode: false,
    threads: [],
    cleaner: new Vacuum(),
    target_channel: parent.value,
    _ctx: ctx,
    on_save: [handle_execution, { action, watch_future }],
    on_cleanup: handle_cleanup,
  };

  await safe_reply(interaction, { embeds: [waiting_embed], flags: 'Ephemeral' });
  const fetch_threads = await fetch_all_threads_from_parent(parent.value, ctx.logger);

  if (fetch_threads.isErr()) return err(fetch_threads.error);
  state.threads = fetch_threads.value;

  if (advanced) {
    make_advanced_embed(interaction, state as State<unknown>);
  } else {
    const res = await handle_execution(state as State<unknown>, interaction, {
      action,
      watch_future,
    });
    if (res?.isErr()) return mapped_err(res.error);
  }

  return ok();
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
      .setDescription(
        'Automatically watch new threads created in this channel, category, or guild.',
      ),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('advanced')
      .setDescription('Configure filters such as required roles, tags, or a regex pattern'),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('global')
      .setDescription('Apply this to the entire server rather than a specific channel'),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads);

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
