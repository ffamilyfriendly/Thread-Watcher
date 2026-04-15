import {
  ChannelType,
  Interaction,
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { GuildChatInteraction, RegistrationScope } from '#/interfaces/BaseCommandInterface';
import { CommandContext, type SubCommand } from '#/interfaces/Command';
import { err, ok, Result } from 'neverthrow';
import { Vacuum } from '#/services/ComponentService';
import { make_advanced_embed, State } from '#/commands/core/_shared/advanced_view';
import { map_err } from '#/utilities/error';
import { get_target } from '../_shared/check_channel_values';
import { channel_service } from '@providers/services/channel_service';
import { CommandError } from '#/utilities/error/def';
import { safe_defer, safe_delete, safe_reply } from '#/utilities/interaction_helpers';
import EmbeddableError from '#/utilities/error/EmbeddableError';

async function handle_execution(state: State, interaction: Interaction, context: null) {
  const result = await channel_service.add_monitor(
    state.target_channel.id,
    state.guild_id,
    { executor_id: interaction.user.id, guild_id: state.guild_id },
    state.filters,
  );
  if (result.isErr()) {
    if (interaction.isRepliable()) EmbeddableError.handle_error(interaction, map_err(result.error));
    return err(result.error);
  }

  const ctx = state._ctx;
  const e = ctx.build_embed('success');
  e.setTitle(ctx.t('commands.monitors.monitor_added_title'));
  e.setDescription(
    ctx.t('commands.monitors.monitor_added_body', { monitor_id: state.target_channel.id }),
  );
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
  const parent = await get_target(interaction, true);

  const advanced = !!interaction.options.getBoolean('advanced');

  if (parent.isErr()) {
    return err(parent.error);
  }

  await safe_defer(interaction);

  const existing_monitor = await channel_service.get_monitor(parent.value.id);
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

  return ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('add')
  .setDescription('Start automatically watching threads in a channel or across the whole server')
  .addChannelOption((o) =>
    o
      .setName('parent')
      .setDescription('The channel, category, or forum to monitor for new threads')
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
      .setName('advanced')
      .setDescription('Configure filters such as required roles, tags, or a regex pattern'),
  )
  .addBooleanOption((opt) =>
    opt
      .setName('global')
      .setDescription('Apply this monitor to the entire server rather than a specific channel'),
  );

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {
    invoker_requires_permission: [PermissionFlagsBits.ManageThreads],
    channel_option_name: 'parent',
  },
  command_data,
  parent_command: 'monitor',
  run,
};

export default command;
