import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { settings } from "../../bot";

const info: Command = {
  run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
    const group = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);

    /**
     * THIS IS A CERTIFIED SILLY ZONE
     * this whole command could've probably been made more simple with a handler of some sort idk
     * I just wanna deploy this and get back to like borderlands 2
     */
    if (group === "logs") {
      if (subcommand === "reset") {
        settings.removeSetting(interaction.guildId ?? "", "LOGCHANNEL");
        buildBaseEmbed("Done", statusType.success, {
          description: "set config \`LOGCHANNEL\` to default value",
        });
      } else {
        const channel = interaction.options.getChannel("channel", true);
        settings
          .setSetting(interaction.guildId ?? "", "LOGCHANNEL", channel.id)
          .then(() => {
            buildBaseEmbed("Done", statusType.success, {
              description: `set config \`LOGCHANNEL\` to value \`${channel.id}\``,
            });
          })
          .catch(() => {
            buildBaseEmbed("Failed", statusType.error, {
              description: `could not set config \`LOGCHANNEL\` to value \`${channel.id}\``,
            });
          });
      }
    } else if (group === "behaviour") {
      if (subcommand === "reset") {
        settings.removeSetting(interaction.guildId ?? "", "BEHAVIOUR");
        buildBaseEmbed("Done", statusType.success, {
          description: "set config \`BEHAVIOUR\` to default value",
        });
      } else {
        const behaviour = interaction.options.getString("behaviour", true);
        settings
          .setSetting(interaction.guildId ?? "", "BEHAVIOUR", behaviour)
          .then(() => {
            buildBaseEmbed("Done", statusType.success, {
              description: `set config \`BEHAVIOUR\` to value \`${behaviour}\``,
            });
          })
          .catch(() => {
            buildBaseEmbed("Failed", statusType.error, {
              description: `could not set config \`BEHAVIOUR\` to value \`${behaviour}\``,
            });
          });
      }
    }
  },
  gatekeeping: {
    userPermissions: [PermissionFlagsBits.ManageThreads],
    ownerOnly: false,
    devServerOnly: true,
  },
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("configure settings")
    .addSubcommandGroup((g) =>
      g
        .setName("logs")
        .setDescription("Where thread-watcher will send logs")
        .addSubcommand((c) =>
          c
            .setName("set")
            .setDescription("select a new value")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("the channel logs will be sent in")
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.PublicThread,
                  ChannelType.PrivateThread,
                )
                .setRequired(true),
            ),
        )
        .addSubcommand((c) =>
          c
            .setName("reset")
            .setDescription("will reset the value to the default"),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("behaviour")
        .setDescription("how thread-watcher will treat threads")
        .addSubcommand((c) =>
          c
            .setName("set")
            .setDescription("select a new value")
            .addStringOption((o) =>
              o
                .setName("behaviour")
                .setDescription("how thread-watcher will treat threads")
                .setRequired(true)
                .setChoices(
                  {
                    name: "un-archive and keep active (default)",
                    value: "DEFAULT",
                  },
                  {
                    name: "un-archive only",
                    value: "UNARCHIVE_ONLY",
                  },
                ),
            ),
        )
        .addSubcommand((c) =>
          c
            .setName("reset")
            .setDescription("will reset the value to the default"),
        ),
    ),
};

export default info;
