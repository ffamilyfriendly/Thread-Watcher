import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Interaction,
  InteractionType,
} from 'discord.js';
import { audit_service, commands, component_service, config, logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { get_audit_send_function, get_embed_function } from 'utilities/embed';
import {
  BaseCommand,
  Command,
  EntitlementsError,
  GuildChatInteraction,
  PermissionsError,
} from 'interfaces/Command';
import { handle_error } from 'utilities/handle_interaction_error';
import i18next from 'i18next';
import { map_err } from 'utilities/error';

function is_standalone_command(command?: BaseCommand): command is Command {
  return command !== undefined && 'run' in command;
}

function check_command_gatekeeping(interaction: ChatInputCommandInteraction, command: BaseCommand) {
  if (command.access_control.developer_only && !config.owners.includes(interaction.user.id)) {
    return handle_error(
      new Error(`this command can only be ran by the developers of the bot`),
      interaction,
      'dev-only',
    );
  }

  const check_perms_in = command.access_control.channel_option_name
    ? interaction.options.getChannel(command.access_control.channel_option_name) ||
      interaction.channel
    : interaction.channel;

  if (command.access_control.invoker_requires_permission) {
    if (check_perms_in && 'permissionsFor' in check_perms_in) {
      const has_perms = interaction.memberPermissions?.has(
        command.access_control.invoker_requires_permission,
      );

      if (!has_perms)
        return handle_error(
          new PermissionsError(command.access_control.invoker_requires_permission, 'user'),
          interaction,
        );
    }
  }

  if (command.access_control.bot_requires_permission) {
    const client_as_member = interaction.guild?.members.me;

    if (check_perms_in && 'permissionsFor' in check_perms_in && client_as_member) {
      const has_perms = check_perms_in
        .permissionsFor(client_as_member)
        .has(command.access_control.bot_requires_permission);

      if (!has_perms)
        return handle_error(
          new PermissionsError(command.access_control.bot_requires_permission, 'bot'),
          interaction,
        );
    }
  }

  if (config.paywall_enabled && command.access_control.required_entitlement_sku) {
    const SKU_ID = command.access_control.required_entitlement_sku;

    const entitlement_active = interaction.entitlements.find(
      (entitlement) => entitlement.id === SKU_ID,
    );

    if (!entitlement_active) return handle_error(new EntitlementsError(SKU_ID), interaction);
  }

  return true;
}

async function handle_command_interaction(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    return handle_error(new Error(`Thread-Watcher only works in guilds`), interaction);
  }

  const embed_builder = get_embed_function(interaction);
  const send_audit = get_audit_send_function(interaction);

  let command = commands.get(interaction.commandName);
  const audit_builder = audit_service.get_builder_from_command_interaction(interaction);
  audit_builder.with_timestamp();
  const handle_err = audit_builder.bind_err_func(handle_error);

  if (!command) {
    logger.error(`no such command, ${interaction.commandName}`);
    return handle_err(
      new Error(`no command with name \`${interaction.commandName}\` could be found`),
      interaction,
    );
  }

  if (!check_command_gatekeeping(interaction, command)) return;

  const t = (key: string, options?: { [key: string]: unknown }) =>
    i18next.t(key, { lng: interaction.locale, ...options });

  const command_context = {
    build_embed: embed_builder,
    send_audit,
    t,
    logger: logger.getSubLogger({ name: interaction.command?.name }),
  };

  const interaction_as_guild_safe = interaction as GuildChatInteraction;

  if (!is_standalone_command(command)) {
    const sub_command = commands.get(
      `${interaction.commandName}.${interaction.options.getSubcommand(true)}`,
    );

    if (!sub_command) {
      logger.error(`no such command, ${interaction.commandName}`);
      return handle_err(
        new Error(`no command with name \`${interaction.commandName}\` could be found`),
        interaction,
      );
    }
    if (!check_command_gatekeeping(interaction, sub_command)) return;

    command = sub_command;
  }

  if (!is_standalone_command(command)) {
    return;
  }

  const result = await command.run(interaction_as_guild_safe, command_context);
  result.match(
    (post_exec_tasks) => {
      logger.debug(
        `interaction "${interaction.id}" (${interaction.commandName}) handled without issues!`,
      );
      audit_builder.commit().then((res) => {
        if (res.isErr()) logger.error('could not log audit?', res.error);
      });

      if (post_exec_tasks) {
        if (post_exec_tasks.cleanup) {
          setTimeout(() => {
            post_exec_tasks.cleanup.func(interaction_as_guild_safe);
          }, post_exec_tasks.cleanup.cleanup_timing);
        }
      }
    },
    (err) => handle_err(map_err(err), interaction),
  );
}

async function handle_autocomplete_interaction(interaction: AutocompleteInteraction) {
  const command = commands.get(interaction.commandName);

  if (!is_standalone_command(command)) return;

  if (!command || !command.autocomplete) {
    logger.error(`no such command, ${interaction.commandName}`);
    return interaction.respond([{ value: 'ERROR', name: 'ERROR COMMAND NOT FOUND' }]);
  }

  const result = await command.autocomplete(interaction);

  result.match(
    () => {
      logger.debug(`interaction "${interaction.id}" handled without issues!`);
    },
    (err) => {
      logger.error(`error running autocomplete ${interaction.commandName}`, err);
      return interaction.respond([{ value: 'ERROR', name: 'ERROR WHEN RUNNING AUTOCOMPLETE' }]);
    },
  );
}

const event: Event<Interaction> = {
  event_name: 'interactionCreate',
  event_callback(interaction) {
    logger.debug(
      `interaction: ${interaction.id} (${interaction.type}) | guildID: ${interaction.guildId} | userID: ${interaction.user.id}`,
    );

    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        handle_command_interaction(interaction as ChatInputCommandInteraction);
        break;
      case InteractionType.ApplicationCommandAutocomplete:
        handle_autocomplete_interaction(interaction);
        break;
      default:
        component_service.recieve_interaction(interaction);
    }
  },
};

export default event;
