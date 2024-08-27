import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ThreadChannel,
} from "discord.js";
import {
  addThread,
  dueArchiveTimestamp,
  removeThread,
  setArchive,
} from "../../utilities/threadActions";
import { Command, statusType } from "../../interfaces/command";
import { threads } from "../../bot";

const watch: Command = {
  run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
    await interaction.deferReply();
    const thread =
      interaction.options.getChannel("thread") || interaction.channel;
    if (!thread) {
      buildBaseEmbed("Something went wrong", statusType.error, {
        ephermal: true,
        description:
          "for forum posts you __need__ to pass the post with the `thread` option.",
      });
      return;
    }
    if (!thread?.type || ![10, 11, 12].includes(thread?.type)) {
      buildBaseEmbed("Cannot watch that!", statusType.error, {
        ephermal: true,
        description: `<#${thread?.id}> is not a thread or forum post.`,
      });
      return;
    }

    if (!(thread instanceof ThreadChannel)) return;

    if (threads.has(thread.id) && threads.get(thread.id)?.watching) {
      removeThread(thread.id)
        .then(() => {
          buildBaseEmbed("Unwatched thread", statusType.success, {
            showAuthor: true,
            description: `Bot will no longer keep <#${thread.id}> active`,
          });
        })
        .catch(() => {
          buildBaseEmbed("Failed to unwatch thread", statusType.error, {
            ephermal: true,
            description: `Bot failed to unwatch <#${thread.id}>`,
          });
        });
    } else {
      addThread(
        thread.id,
        dueArchiveTimestamp(
          thread.autoArchiveDuration || 0,
          thread.lastMessage?.createdAt,
        ),
        interaction.guildId || "",
      )
        .then(() => {
          if (!thread.archived || thread.unarchivable) {
            buildBaseEmbed("Watched thread", statusType.success, {
              showAuthor: true,
              description: `Bot will keep <#${thread.id}> active`,
            });
          } else {
            buildBaseEmbed("Watched thread but...", statusType.warning, {
              showAuthor: true,
              description: `Bot has added <#${thread.id}> to the watchlist.\n\nHowever, the thread will __**NOT**__ be kept active as the bot has insufficient permissions for the thread`,
            });
          }

          if (thread.archived && thread.unarchivable) {
            setArchive(thread);
          }
        })
        .catch(() => {
          buildBaseEmbed("Failed to watch thread", statusType.error, {
            ephermal: true,
            description: `Bot failed to watch <#${thread.id}>`,
          });
        });
    }
  },
  gatekeeping: {
    userPermissions: [PermissionFlagsBits.ManageThreads],
    ownerOnly: false,
    devServerOnly: false,
  },
  data: new SlashCommandBuilder()
    .setName("watch")
    .setDescription("watch or unwatch a thread"),
  externalOptions: [
    {
      channel_types: [10, 11, 12, 16],
      description: "thread to watch or unwatch",
      name: "thread",
      type: 7,
    },
  ],
};

export default watch;
