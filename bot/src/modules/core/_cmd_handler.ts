import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  InteractionType,
} from 'discord.js';
import { BaseCommand, Command, CommandContext, GuildChatInteraction } from 'interfaces/Command';
import { mapped_err } from 'utilities/error';
import Config from '@providers/config';
import Commands from '@providers/commands';
import Lgr from '@providers/logger';
import ComponentService from '@providers/services/component_service';
import { err, ok } from 'neverthrow';
import EmbeddableError from 'utilities/error/EmbeddableError';
import { EntitlementsError, PermissionsError } from 'utilities/error/def';
import { from_interaction } from 'utilities/i18def';

const config = Config.instance;
const commands = Commands.instance;
const logger = Lgr.instance;
const component_service = ComponentService.instance;

function get_command_context(cmd: Interaction): CommandContext {
  return {
    t: from_interaction(cmd),
    logger: logger.getSubLogger({
      name: cmd.isCommand() ? cmd.commandName : `interaction ${cmd.id}`,
    }),
    build_embed: (style) => {
      const e = new EmbedBuilder();
      const use_style = style ? config.style[style] : config.style.info;
      e.setColor(use_style.colour as ColorResolvable);
      return e;
    },
  };
}

function is_standalone_command(command?: BaseCommand): command is Command {
  return command !== undefined && 'run' in command;
}

function check_command_gatekeeping(interaction: ChatInputCommandInteraction, command: BaseCommand) {
  if (command.access_control.developer_only && !config.owners.includes(interaction.user.id)) {
    return EmbeddableError.handle_error(
      interaction,
      new Error('this command can only be ran by the devs'),
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

      if (!has_perms) {
        const error = new PermissionsError(
          command.access_control.invoker_requires_permission,
          'user',
        );
        return error.send_error(interaction);
      }
    }
  }

  if (command.access_control.bot_requires_permission) {
    const client_as_member = interaction.guild?.members.me;

    if (check_perms_in && 'permissionsFor' in check_perms_in && client_as_member) {
      const has_perms = check_perms_in
        .permissionsFor(client_as_member)
        .has(command.access_control.bot_requires_permission);

      if (!has_perms) {
        const error = new PermissionsError(command.access_control.bot_requires_permission, 'bot');
        return error.send_error(interaction);
      }
    }
  }

  if (config.paywall.enabled && command.access_control.required_entitlement_sku) {
    const SKU_ID = command.access_control.required_entitlement_sku;

    const entitlement_active = interaction.entitlements.find(
      (entitlement) => entitlement.id === SKU_ID,
    );

    if (!entitlement_active) {
      const error = new EntitlementsError(SKU_ID);
      return error.send_error(interaction);
    }
  }

  return true;
}

async function handle_command_interaction(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    const e = new Error(`Thread-Watcher only works in guilds`);
    EmbeddableError.handle_error(interaction, e);
    return err(e);
  }

  let command = commands.get(interaction.commandName);

  if (!command) {
    logger.error(`no such command, ${interaction.commandName}`);
    const error = new Error(`no command with name \`${interaction.commandName}\` could be found`);

    return err(error);
  }

  if (!check_command_gatekeeping(interaction, command)) return ok();

  const command_context = get_command_context(interaction);

  const interaction_as_guild_safe = interaction as GuildChatInteraction;

  if (!is_standalone_command(command)) {
    const sub_command = commands.get(
      `${interaction.commandName}.${interaction.options.getSubcommand(true)}`,
    );

    if (!sub_command) {
      logger.error(`no such command, ${interaction.commandName}`);
      const error = new Error(`no command with name \`${interaction.commandName}\` could be found`);
      return err(error);
    }
    if (!check_command_gatekeeping(interaction, sub_command)) return ok();

    command = sub_command;
  }

  if (!is_standalone_command(command)) {
    return ok();
  }

  const result = await command.run(interaction_as_guild_safe, command_context);
  if (result.isErr()) return mapped_err(result.error);
  else {
    logger.debug(`Command interaction with id ${interaction.id} handled without issues!`);
    return ok();
  }
}

async function handle_autocomplete_interaction(interaction: AutocompleteInteraction) {
  const command = commands.get(interaction.commandName);

  if (!is_standalone_command(command)) return ok();

  if (!command || !command.autocomplete) {
    logger.error(`no such command, ${interaction.commandName}`);
    interaction.respond([{ value: 'ERROR', name: 'ERROR COMMAND NOT FOUND' }]);
    return err(new Error('not found'));
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
  return ok();
}

export default async function on_interaction(interaction: Interaction, _l: any) {
  logger.debug(
    `interaction: ${interaction.id} (${interaction.type}) | guildID: ${interaction.guildId} | userID: ${interaction.user.id}`,
  );

  switch (interaction.type) {
    case InteractionType.ApplicationCommand:
      return await handle_command_interaction(interaction as ChatInputCommandInteraction);
    case InteractionType.ApplicationCommandAutocomplete:
      return await handle_autocomplete_interaction(interaction);
    default:
      return component_service.recieve_interaction(interaction);
  }
}
