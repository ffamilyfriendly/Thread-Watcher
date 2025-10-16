import { client, thread_service } from 'bot';
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

import {
  Command,
  CommandError,
  CommandExecutionContext,
  PostExecutionTasks,
  RegistrationScope,
} from 'interfaces/Command';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import {
  AdvancedFilterOptions,
  make_advanced_embed,
  State,
} from 'utilities/commands/advanced_view';
import { create_channel_link } from './list';

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
    const active_threads_in_channel = await ResultAsync.fromSafePromise(
      channel.threads.fetchActive(),
    );

    const archived_threads_in_channel = await ResultAsync.fromSafePromise(
      channel.threads.fetchArchived(),
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

async function should_be_watched(thread: ThreadChannel, filters: AdvancedFilterOptions) {
  const name_matches_regex = filters.regex?.test(thread.name) ?? true;

  const thread_guild = await ResultAsync.fromSafePromise(client.guilds.fetch(thread.guildId));
  if (thread_guild.isErr()) return err(thread_guild.error);

  const thread_owner = await ResultAsync.fromSafePromise(
    thread_guild.value.members.fetch(thread.ownerId),
  );
  if (thread_owner.isErr()) return err(thread_owner.error);

  const role_list_as_ids = filters.role_whitelist?.map((r) => r.id);
  const author_has_role = !!thread_owner.value.roles.cache.find((r) =>
    role_list_as_ids?.includes(r.id),
  );

  const tag_list_as_ids = thread.appliedTags?.map((r) => r);
  const thread_has_tag = !!tag_list_as_ids.find((t) => filters.tags?.includes(t));

  const role_thing = filters.role_whitelist ? author_has_role : true;
  const tag_thing = filters.tags ? thread_has_tag : true;

  return name_matches_regex && role_thing && tag_thing;
}

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
  for (const thread of state.threads) {
    const should_be_actioned = await should_be_watched(thread, state.filters);
    if (!should_be_actioned) continue;
    threads_actioned++;

    // TODO: handle cases where the thread_service returns err. We don't rn
    switch (context.action) {
      case 'WATCH':
        ResultAsync.fromSafePromise(thread_service.watch_thread(thread));
        break;
      case 'UNWATCH':
        ResultAsync.fromSafePromise(thread_service.unwatch_thread(thread));
        break;
      case 'TOGGLE':
        ResultAsync.fromSafePromise(thread_service.toggle_thread_watch_status(thread));
        break;
    }
  }

  const result_embed = state._ctx.build_embed({
    title: `${ACTION_AS_TEXT_LOOKUP_TABLE[context.action]} ${threads_actioned} threads`,
    description: `in ${create_channel_link(state.target_channel as GuildBasedChannel)}`,
    style: 'success',
  });

  result_embed.setTimestamp();
  result_embed.setAuthor({
    iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL,
    name: interaction.user.username,
  });

  state._ctx.send_audit(result_embed, interaction);
}

function handle_cleanup(state: State, interaction: Interaction) {
  if ('update' in interaction) {
    interaction.update({ components: [], content: 'cancelled' });
  } else if (interaction.isRepliable()) {
    const func = interaction.replied ? interaction.editReply : interaction.reply;
    func({ components: [], content: 'cancelled' });
  }
  state.cleaner.clean();
}

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<PostExecutionTasks, CommandError>> {
  const parent = interaction.options.getChannel('parent') || interaction.channel;

  const action: BATCH_OPTIONS =
    (interaction.options.getString('action') as BATCH_OPTIONS) ?? 'WATCH';

  const advanced = !!interaction.options.getBoolean('advanced');
  const watch_future = !!interaction.options.getBoolean('watch-future');

  if (!parent || !('guild' in parent) || !ALLOWED_CHANNEL_TYPES.includes(parent.type)) {
    return err(new Error('parent cannot hold threads'));
  }

  const waiting_embed = ctx.build_embed({
    title: '🔍 Fetching Threads...',
    description: `
    Hang tight! I'm gathering all threads in **${create_channel_link(parent)}** (including archived ones)
    *This may take a moment if there's many threads...*
    `,
    style: 'info',
  });

  const state: State<ExecutionContext> = {
    components: [],
    filters: {},
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

  const ms_15_minutes = 1000 * 60 * 15;
  const post_exec_tasks: PostExecutionTasks = {
    cleanup: {
      func: () => handle_cleanup(state as State<unknown>, interaction),
      cleanup_timing: ms_15_minutes,
    },
  };

  return ok(post_exec_tasks);
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
    channel_option_name: 'parent',
  },
  command_data,
  run,
};

export default command;
