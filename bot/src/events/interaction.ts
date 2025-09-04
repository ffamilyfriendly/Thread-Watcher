import {
  ActionRow,
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  Interaction,
  InteractionType,
  messageLink,
} from 'discord.js';
import { commands, component_service, config, logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { get_audit_send_function, get_embed_function } from 'utilities/embed';
import { EntitlementsError, GuildChatInteraction, PermissionsError } from 'interfaces/Command';
import { handle_error } from 'utilities/handle_interaction_error';
import { ResultAsync } from 'neverthrow';

async function handle_command_interaction(interaction: ChatInputCommandInteraction) {
  const embed_builder = get_embed_function(interaction);
  const send_audit = get_audit_send_function(interaction);

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.error(`no such command, ${interaction.commandName}`);
    return handle_error(
      interaction,
      new Error(`no command with name \`${interaction.commandName}\` could be found`),
    );
  }

  if (!interaction.inGuild()) {
    return handle_error(interaction, new Error(`Thread-Watcher only works in guilds`));
  }

  if (command.access_control.developer_only && !config.owners.includes(interaction.user.id)) {
    return handle_error(
      interaction,
      new Error(`this command can only be ran by the developers of the bot`),
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
          interaction,
          new PermissionsError(command.access_control.invoker_requires_permission, 'user'),
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
          interaction,
          new PermissionsError(command.access_control.bot_requires_permission, 'bot'),
        );
    }
  }

  if (config.paywall_enabled && command.access_control.required_entitlement_sku) {
    const SKU_ID = command.access_control.required_entitlement_sku;

    const entitlement_active = interaction.entitlements.find(
      (entitlement) => entitlement.id === SKU_ID,
    );

    if (!entitlement_active) return handle_error(interaction, new EntitlementsError(SKU_ID));
  }

  const command_context = {
    build_embed: embed_builder,
    send_audit,
    logger: logger.getSubLogger({ name: interaction.command?.name }),
  };

  const interaction_as_guild_safe = interaction as GuildChatInteraction;

  const result = await command.run(interaction_as_guild_safe, command_context);

  result.match(
    () => {
      logger.debug(`interaction "${interaction.id}" handled without issues!`);
    },
    (err) => handle_error(interaction, err),
  );
}

async function handle_autocomplete_interaction(interaction: AutocompleteInteraction) {
  const command = commands.get(interaction.commandName);

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
