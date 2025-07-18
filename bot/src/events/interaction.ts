import { ChatInputCommandInteraction, Interaction, InteractionType } from 'discord.js';
import { commands, config, logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { get_embed_function } from 'utilities/embed';
import { EntitlementsError, PermissionsError } from 'interfaces/Command';
import { handle_error } from 'utilities/handle_interaction_error';

async function handle_command_interaction(interaction: ChatInputCommandInteraction) {
  const embed_builder = get_embed_function(interaction);
  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.error(`no such command, ${interaction.commandName}`);
    return handle_error(
      interaction,
      new Error(`no command with name \`${interaction.commandName}\` could be found`),
    );
  }

  if (command.access_control.developer_only && !config.owners.includes(interaction.user.id)) {
    return handle_error(
      interaction,
      new Error(`this command can only be ran by the developers of the bot`),
      'dev-only',
    );
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
  };

  const result = await command.run(interaction, command_context);

  result.match(
    () => {
      logger.debug(`interaction "${interaction.id}" handled without issues!`);
    },
    (err) => handle_error(interaction, err),
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
    }
  },
};

export default event;
