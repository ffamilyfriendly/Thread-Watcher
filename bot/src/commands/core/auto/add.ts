import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildBasedChannel,
  Interaction,
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import {
  Command,
  CommandError,
  PostExecutionTasks,
  RegistrationScope,
  SubCommand,
} from 'interfaces/Command';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import { make_advanced_embed, State } from 'utilities/commands/advanced_view';
import { create_channel_link } from '../list';
import { audit_service, channel_service } from 'bot';
import { CommandContext } from 'utilities/command_context';

async function handle_execution(state: State, interaction: Interaction, context: null) {
  let result_embed = state._ctx.build_embed({
    title: `Monitoring for new Threads`,
    description: `in ${create_channel_link(state.target_channel as GuildBasedChannel)}`,
    style: 'success',
  });

  const did_work = await channel_service.add_channel(state.target_channel, state.filters);
  if (did_work.isErr()) {
    result_embed = state._ctx.build_embed({
      title: `could not monitor for new Threads`,
      description: `in ${create_channel_link(state.target_channel as GuildBasedChannel)}`,
      style: 'error',
    });
  } else {
    audit_service.log_event('CHANNEL_MONITOR_START', interaction.guildId!, interaction.user.id, {
      reason: JSON.stringify(state.filters),
      command_name: 'auto add',
      target_id: state.target_channel.id,
    });
  }

  result_embed.setTimestamp();
  result_embed.setAuthor({
    iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL,
    name: interaction.user.username,
  });

  state._ctx.send_audit(result_embed, interaction);
  state._ctx.ok();
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
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const parent = interaction.options.getChannel('parent') || interaction.channel;
  const advanced = !!interaction.options.getBoolean('advanced');

  if (!parent || !('threads' in parent)) {
    return err(new Error('parent cannot hold threads'));
  }

  await interaction.deferReply();

  const existing_monitor = await channel_service.get_channel(parent.id);
  if (existing_monitor.isErr()) {
    return err(existing_monitor.error);
  }

  const state: State<null> = {
    components: [],
    filters: {
      regex: existing_monitor.value?.regex,
      tags: existing_monitor.value?.tags,
      role_whitelist: existing_monitor.value?.role_whitelist,
    },
    edit_mode: existing_monitor.value != null,
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

  return ctx.get_execution_promise();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('add')
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

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {
    invoker_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'parent',
  },
  command_data,
  parent_command: 'auto',
  run,
};

export default command;
