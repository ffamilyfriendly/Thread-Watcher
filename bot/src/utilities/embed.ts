import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  CommandInteraction,
  EmbedBuilder,
  Interaction,
  messageLink,
} from 'discord.js';
import { config, setting_service } from 'bot';
import { SETTINGS_KEYS } from 'services/SettingService';

export function get_tagged_embed(interaction: Interaction) {
  const embed = new EmbedBuilder();
  embed.setAuthor({
    iconURL: interaction.user.avatarURL() || interaction.user.defaultAvatarURL,
    name: interaction.user.displayName,
  });
  embed.setTimestamp();

  return embed;
}

type StyleOption = keyof typeof config.style;

export interface EmbedBuilderProps {
  title: string;
  description?: string;
  style: StyleOption | { colour: string; emoji?: string };
  auto_respond?: boolean;
  ephermal?: boolean;
  fields?: { name: string; value: string; inline?: boolean }[];
}

export function get_audit_send_function(interaction: Interaction) {
  return async function (
    embed_param: EmbedBuilder | EmbedBuilder[],
    overwrite_interaction?: Interaction,
  ) {
    interaction = overwrite_interaction ?? interaction;
    if (!interaction.guildId) return;
    if (!interaction) {
      console.log('INTERACTION IS NULL');
      return;
    }

    const LOGGING_CHANNEL = await setting_service.get_setting_with_default<string | null>(
      interaction.guildId,
      SETTINGS_KEYS.logging_channel,
      null,
    );

    const logging_channel =
      LOGGING_CHANNEL.isOk() && LOGGING_CHANNEL.value !== null
        ? await interaction.client.channels.fetch(LOGGING_CHANNEL.value)
        : null;

    const embeds = Array.isArray(embed_param) ? embed_param : [embed_param];

    if (logging_channel && logging_channel.isSendable()) {
      logging_channel.send({ embeds }).then((log_message) => {
        const message_link = messageLink(logging_channel.id, log_message.id);

        const button_row = new ActionRowBuilder<ButtonBuilder>();
        const log_message_button = new ButtonBuilder();
        log_message_button.setLabel('View Log');
        log_message_button.setURL(message_link);
        log_message_button.setStyle(ButtonStyle.Link);

        button_row.addComponents(log_message_button);

        if (interaction.isCommand()) {
          if (interaction.replied) {
            interaction.editReply({
              embeds,
              components: [button_row],
            });
          } else {
            interaction.reply({
              embeds,
              flags: ['Ephemeral'],
              components: [button_row],
            });
          }
        } else if (interaction.isButton()) {
          interaction.update({
            components: [button_row],
          });
        }
      });
    } else {
      if (interaction.isCommand()) {
        if (interaction.replied || interaction.deferred) {
          interaction.editReply({ embeds });
        } else {
          interaction.reply({ embeds });
        }
      } else if (interaction.isButton())
        interaction.update({
          embeds,
          components: [],
        });
    }
  };
}

export function get_embed_function(interaction: CommandInteraction) {
  return ({ title, auto_respond, ...props }: EmbedBuilderProps) => {
    const style = typeof props.style === 'string' ? config.style[props.style] : props.style;

    const embed = new EmbedBuilder();
    embed.setTitle(title);
    embed.setColor(style.colour as ColorResolvable);

    if (props.description) embed.setDescription(props.description);
    if (props.fields) embed.addFields(props.fields);

    if (auto_respond) {
      if (interaction.replied || interaction.deferred) {
        interaction.editReply({
          embeds: [embed],
        });
      } else {
        interaction.reply({
          embeds: [embed],
          flags: props.ephermal ? ['Ephemeral'] : [],
        });
      }
    }

    return embed;
  };
}
