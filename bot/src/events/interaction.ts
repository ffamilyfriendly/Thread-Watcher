import { Client, CommandInteraction, Interaction, InteractionType } from 'discord.js';
import { commands, config, logger } from 'bot';
import { Event } from 'interfaces/ClientEvent';
import { get_embed_function } from 'utilities/embed';

function handle_command_interaction(interaction: CommandInteraction) {
  const embed_builder = get_embed_function(interaction);
  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.error(`no such command, ${interaction.commandName}`);
    embed_builder({
      title: 'Oopsie',
      description: 'cum',
      style: 'error',
      auto_respond: true,
      ephermal: true,
    });
    return;
  }

  if (command.access_control.developer_only && !config.owners.includes(interaction.user.id)) {
    embed_builder({
      title: 'Developer Only',
      description: 'cum',
      style: 'error',
      auto_respond: true,
      ephermal: true,
    });
    return;
  }

  if (config.paywall_enabled && command.access_control.required_entitlement_sku) {
    const SKU_IDS = Array.isArray(command.access_control.required_entitlement_sku)
      ? command.access_control.required_entitlement_sku
      : [command.access_control.required_entitlement_sku];

    const entitlement_active = interaction.entitlements.find((entitlement) =>
      SKU_IDS.includes(entitlement.id),
    );

    if (!entitlement_active) {
      embed_builder({
        title: 'Paywall',
        description: 'pffftttt',
        style: 'info',
        auto_respond: true,
        ephermal: true,
      });
      return;
    }
  }

  const command_context = {
    build_embed: embed_builder,
  };

  const result = command.run(interaction, command_context);

  result.match(
    () => {
      logger.debug(`interaction "${interaction.id}" handled without issues!`);
    },
    (err) => {
      logger.error(`error encountered while handling interaction "${interaction.id}"`, err);
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
        handle_command_interaction(interaction);
        break;
    }
  },
};

export default event;
