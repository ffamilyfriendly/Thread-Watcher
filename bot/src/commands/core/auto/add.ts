import {
  ChannelType,
  Interaction,
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import {
  CommandError,
  GuildChatInteraction,
  RegistrationScope,
} from 'interfaces/BaseCommandInterface';
import { type SubCommand } from 'interfaces/Command';
import { err, Result } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import { make_advanced_embed, State } from 'commands/core/_shared/advanced_view';
import { CommandContext } from 'utilities/command_context';
import { map_err } from 'utilities/error';
import { get_target } from '../_shared/check_channel_values';
import { channel_service } from '@providers/services/channel_service';
import { audit_service } from '@providers/services/audit_service';

async function handle_execution(state: State, interaction: Interaction, context: null) {
  const did_work = await channel_service.add_channel(
    state.target_channel.id,
    state.guild_id,
    state.filters,
  );
  if (did_work.isErr()) {
    return state._ctx.err(map_err(did_work.error));
  }

  const audit_res = await audit_service.log_monitor_added(
    state.target_channel.id,
    interaction.guildId!,
    interaction.user.id,
    state.filters,
  );

  if (audit_res.isErr()) return state._ctx.err(audit_res.error);

  state._ctx.send_audit(audit_res.value, interaction);
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
  interaction: GuildChatInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const parent = await get_target(interaction);

  const advanced = !!interaction.options.getBoolean('advanced');

  if (parent.isErr()) {
    return err(parent.error);
  }

  await interaction.deferReply();

  const existing_monitor = await channel_service.get_channel(parent.value.id);
  if (existing_monitor.isErr()) {
    return err(existing_monitor.error);
  }

  const state: State<null> = {
    components: [],
    filters: {
      regex: existing_monitor.value?.regex,
      tags: existing_monitor.value?.tags ?? null,
      role_whitelist: existing_monitor.value?.role_whitelist ?? null,
    },
    guild_id: interaction.guildId,
    edit_mode: existing_monitor.value != null,
    threads: [],
    cleaner: new Vacuum(),
    target_channel: parent.value,
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
  )
  .addBooleanOption((opt) =>
    opt.setName('global').setDescription('if you want this monitor to be server wide'),
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
