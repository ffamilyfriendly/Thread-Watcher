import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command, statusType } from "../../interfaces/command";

const auto: Command = {
  run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
    buildBaseEmbed("Depracated", statusType.warning, {
      description:
        "The functionality of this command has been moved to `/batch`",
    });
  },
  gatekeeping: {
    userPermissions: [PermissionFlagsBits.ManageThreads],
    ownerOnly: false,
    devServerOnly: false,
  },
  data: new SlashCommandBuilder()
    .setName("auto")
    .setDescription(
      "automatically watch created threads in a channel or forum",
    ),
  externalOptions: [
    {
      channel_types: [15, 5, 0],
      description: "channel to automatically watch threads in",
      name: "channel",
      type: 7,
    },
    {
      description: "advanced filters",
      name: "advanced",
      type: 5,
      required: false,
    },
  ],
};

export default auto;
