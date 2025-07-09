import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandExecutionContext, RegistrationScope } from 'interfaces/Command';
import { ok, Result } from 'neverthrow';

function run(interaction: CommandInteraction, ctx: CommandExecutionContext): Result<void, unknown> {
  const embed = ctx.build_embed({
    title: 'Information',
    description: `Thread-Watcher is an [Open Source](https://github.com/ffamilyfriendly/thread-watcher) thread focused bot created to take your threads to the **next level**!

With Thread-Watcher, you can effortlessly organise and enhance your threads with powerful features and intuitive controls. 

We hope that you'll find Thread-Watcher to be a great companion in your server and welcome you to our support server if there's anything we can do to help.
`,
    style: 'info',
    auto_respond: false,
  });

  const button_row = new ActionRowBuilder<ButtonBuilder>();
  const support_server_button = new ButtonBuilder();
  const website_link_button = new ButtonBuilder();

  website_link_button.setStyle(ButtonStyle.Link);
  website_link_button.setURL('https://threadwatcher.xyz');
  website_link_button.setLabel('Website');
  website_link_button.setEmoji('🌐');

  support_server_button.setStyle(ButtonStyle.Link);
  support_server_button.setURL('https://botsuite.co/join');
  support_server_button.setLabel('Support Server');
  support_server_button.setEmoji('🆘');

  button_row.addComponents(website_link_button, support_server_button);

  interaction.reply({
    embeds: [embed],
    components: [button_row],
  });
  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('get to know the bot and find out what it can do for you');

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
