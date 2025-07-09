import { ColorResolvable, CommandInteraction, Embed, EmbedBuilder } from 'discord.js';
import { config } from 'bot';

type StyleOption = keyof typeof config.style;

export interface EmbedBuilderProps {
  title: string;
  description?: string;
  style: StyleOption | { colour: string; emoji?: string };
  auto_respond?: boolean;
  ephermal?: boolean;
  fields?: { name: string; value: string }[];
}

export function get_embed_function(interaction: CommandInteraction) {
  return ({ title, auto_respond, ...props }: EmbedBuilderProps) => {
    const style = typeof props.style === 'string' ? config.style[props.style] : props.style;

    const embed = new EmbedBuilder();
    embed.setTitle(`${style.emoji} ${title}`.trim());
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
