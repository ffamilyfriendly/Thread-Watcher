import {
  Channel,
  ChannelType,
  Guild,
  Interaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from 'discord.js';

import { GuildChatInteraction, RegistrationScope } from 'interfaces/BaseCommandInterface';
import { CommandContext, type Command } from 'interfaces/Command';

import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import { make_advanced_embed, State } from 'commands/core/_shared/advanced_view';
import { create_channel_link } from './list';
import ThreadService from 'services/ThreadService';
import { map_err } from 'utilities/error';
import { AuditMeta, PartialAuditObject } from 'services/AuditService';
import { get_target } from './_shared/check_channel_values';
import { audit_service } from '@providers/services/audit_service';
import { client } from '@providers/client';
import { thread_service } from '@providers/services/thread_service';
import { channel_service } from '@providers/services/channel_service';
import { CommandError } from 'utilities/error/def';
import { logger } from '@providers/logger';
import { safe_reply } from 'utilities/interaction_helpers';

async function fetch_all_threads_from_parent(channel: Channel | Guild) {
  let thread_list: ThreadChannel[] = [];

  if (channel instanceof Guild) {
    for (const child_channel of channel.channels.cache.values()) {
      const children_of_guild_threads = await fetch_all_threads_from_parent(child_channel);

      if (children_of_guild_threads.isErr()) {
        logger.error(
          `[BATCH] could not get children of ${child_channel.id} (guild: ${child_channel.guildId})`,
        );
        continue;
      }

      thread_list.push(...children_of_guild_threads.value);
    }

    return ok(thread_list);
  }

  if (channel.type === ChannelType.GuildCategory) {
    for (const child_of_channel of channel.children.cache.values()) {
      const child_of_channel_threads = await fetch_all_threads_from_parent(child_of_channel);

      if (child_of_channel_threads.isErr()) {
        logger.error(
          `[BATCH] could not get children of ${child_of_channel.id} (guild: ${child_of_channel.guildId})`,
        );
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
    if (should_be_actioned.isErr()) {
      return state._ctx.err(should_be_actioned.error);
    }
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
    parent.value instanceof Guild ? 'in this guild' : create_channel_link(parent.value);

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
  const fetch_threads = await fetch_all_threads_from_parent(parent.value);

  if (fetch_threads.isErr()) return err(fetch_threads.error);
  state.threads = fetch_threads.value;

  if (advanced) {
    make_advanced_embed(interaction, state as State<unknown>);
  } else {
    handle_execution(state as State<unknown>, interaction, { action, watch_future });
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
      .setDescription('Automatically watch new threads created in this channel/category'),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('advanced')
      .setDescription('Use filters (regex, roles, tags) to selectively watch/unwatch threads'),
  )
  .addBooleanOption((opt) =>
    opt.setName('global').setDescription('if you want this monitor to be server wide'),
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
