import { component_service } from 'bot';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import {
  Command,
  CommandError,
  CommandExecutionContext,
  RegistrationScope,
} from 'interfaces/Command';
import { ok, Result } from 'neverthrow';

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<void, CommandError>> {
  const channel_builder = new ChannelSelectMenuBuilder();
  const bruh = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channel_builder);

  const text_field = new TextDisplayBuilder().setContent('Which food would you like to eat?');

  const components = [
    text_field,
    new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('cuh'))
      .addActionRowComponents(bruh),
  ];

  const wait_time_in_ms = 1000 * 60 * 30;
  const response = component_service.wait_for_interaction(
    channel_builder,
    (int) => int.user.id == interaction.user.id,
    wait_time_in_ms,
  );

  interaction.reply({
    components: components as any,
    flags: ['IsComponentsV2'],
  });

  (await response).match(
    (response) => {
      const value = response.values[0];
      text_field.setContent(`yay!!! got ${value} which is <#${value}>`);
      components.pop();

      response.update({
        components: components as any,
      });
    },
    (err) => {
      interaction.editReply({
        content: `grrrrr tooo late!!!!!!! ${err}`,
      });
      // HANDLE ERROR OR SOMETHING
      // only error right now is time running out
    },
  );

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('configure the bot :D');

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
