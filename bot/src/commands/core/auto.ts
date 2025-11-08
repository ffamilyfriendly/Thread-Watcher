import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildBasedChannel,
  Interaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
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
import { make_advanced_embed, State } from 'utilities/commands/advanced_view';
import { create_channel_link } from './list';
import { channel_service } from 'bot';

async function handle_execution(state: State, interaction: Interaction, context: null) {
  let result_embed = state._ctx.build_embed({
    title: `Monitoring for new Threads`,
    description: `in ${create_channel_link(state.target_channel as GuildBasedChannel)}`,
    style: 'success',
  });

  const did_work = await ResultAsync.fromSafePromise(
    channel_service.add_channel(state.target_channel, state.filters),
  );

  if (did_work.isErr()) {
    result_embed = state._ctx.build_embed({
      title: `could not monitor for new Threads`,
      description: `in ${create_channel_link(state.target_channel as GuildBasedChannel)}`,
      style: 'error',
    });
  }

  result_embed.setTimestamp();
  result_embed.setAuthor({
    iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL,
    name: interaction.user.username,
  });

  state._ctx.send_audit(result_embed, interaction);
}

function handle_cleanup(state: State, interaction: Interaction) {
  state.cleaner.clean();
  if ('update' in interaction) {
    interaction.update({ components: [], content: 'cancelled' });
    return;
  }

  if (interaction.isRepliable()) {
    if (interaction.replied) {
      interaction.editReply({ components: [], content: 'Cancelled' });
    } else {
      interaction.reply({ components: [], content: 'Cancelled', ephemeral: true });
    }
  }
}

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<PostExecutionTasks, CommandError>> {
  const parent = interaction.options.getChannel('parent') || interaction.channel;
  const advanced = !!interaction.options.getBoolean('advanced');

  if (!parent || !('threads' in parent)) {
    return err(new Error('parent cannot hold threads'));
  }

  await interaction.deferReply();

  const state: State<null> = {
    components: [],
    filters: {},
    threads: [],
    cleaner: new Vacuum(),
    target_channel: parent,
    _ctx: ctx,
    on_save: [handle_execution, null],
    on_cleanup: handle_cleanup,
  };

  if (advanced) {
    make_advanced_embed(interaction, state as State<unknown>);
  } else {
    handle_execution(state as State<unknown>, interaction, null);
  }

  const ms_15_minutes = 1000 * 60 * 15;
  const post_exec_tasks: PostExecutionTasks = {
    cleanup: {
      func: (int) => handle_cleanup(state as State<unknown>, int),
      cleanup_timing: ms_15_minutes,
    },
  };

  return ok(post_exec_tasks);
}

const command_data = new SlashCommandBuilder()
  .setName('auto')
  .setDescription('automatically watch threads in channel')
  .addChannelOption((o) =>
    o
      .setName('parent')
      .setDescription('The thread to start or stop monitoring')
      .addChannelTypes([
        ChannelType.GuildCategory,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      ]),
  )
  .addBooleanOption((opt) =>
    opt.setName('advanced').setDescription('if u wanna use advanced options idk'),
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
