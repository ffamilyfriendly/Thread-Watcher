import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
  ThreadChannel,
  ChannelType,
  ColorResolvable,
  CategoryChannel,
  TextChannel,
  ForumChannel,
  NewsChannel,
  GuildMember,
} from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, config } from "../../bot";
import Chunkable from "../../utilities/Chunkable";

interface field {
  name: string;
  value: string;
}

/**
 * This function will split an array of discord channel tags ( <#CHANNEL_ID> ) into embed fields of 1024 chars each
 * as some of yall have a metric tonne of watched threads.
 * The function also limits the total chars of embed field values to a total of 5500 to not bypass the hardlimit of
 * 6000 chars per embed object.
 *
 * This might make it now show all threads if any user out there somehow manages to have 5500 chars worth of threads stored
 * which is why this function will be supplemented with a function to create more embeds if needed as 10 embeds are allowed per interaction response
 */
const fitIntoFields = (
  name: string,
  values: string[],
  totalLength = 0,
): { fieldArr: field[]; totalLength: number; remainingValues: string[] } => {
  // Embed limits https://discord.com/developers/docs/resources/channel#embed-object-embed-limits
  const MAXLENGTH = 1024;

  const fields: field[] = [];
  let buff = "";
  const remainingValues: string[] = [];

  for (const value of values) {
    // Length of the buffer plus the string currently added to it
    const iLength = buff.length + value.length + 2;
    totalLength += value.length + 2;

    /**
     * ensure the current thread can fit into the current field (buff).
     * If not: push the current field into the array and initiate a new one with the current value
     */
    if (iLength > MAXLENGTH) {
      fields.push({
        name: `${name} ${fields.length + 1}`,
        value: buff.substring(0, buff.length - 2),
      });
      buff = `${value}, `;
    } else {
      buff += `${value}, `;
    }
  }

  fields.push({
    name: `${name} ${fields.length + 1}`,
    value: buff.substring(0, buff.length - 2),
  });

  return { fieldArr: fields, totalLength, remainingValues };
};

interface resObj {
  channels: string[];
  threads: string[];
  threadsFailed: string[];
  channelsFailed: string[];
}

export function getDirectTag(
  c: ThreadChannel | TextChannel | ForumChannel | NewsChannel | CategoryChannel,
) {
  return `[#${c.name}](https://discord.com/channels/${c.guildId}/${c.id})`;
}

const threads: Command = {
  run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
    let pub = interaction.options.getBoolean("public");
    const show = interaction.options.getString("show") || "all";

    // Only allow users with ManageThreads to create public /threads messages
    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageThreads) &&
      pub
    )
      pub = false;

    await interaction.deferReply({ ephemeral: !(pub || false) });

    const res: resObj = {
      channels: [],
      threads: [],
      threadsFailed: [],
      channelsFailed: [],
    };

    const getThreads = async () => {
      if (!interaction.guildId) return;
      const threads = await db.getThreads(interaction.guildId);
      for (const _t of threads) {
        const thread = await interaction.client.channels.fetch(_t.id);
        if (thread) {
          if (
            thread.type !== ChannelType.PrivateThread &&
            thread.type !== ChannelType.PublicThread
          )
            return;
          if (
            !interaction.memberPermissions?.has(PermissionFlagsBits.ViewChannel)
          )
            continue;
          if (!_t.watching) continue;
          // This is used instead of hotlinking ( <#ID> ) as discord shows un-cached threads as #deleted-channel if not in sidebar
          // even when thread is un-archived
          res.threads.push(getDirectTag(thread));
        } else {
          res.threadsFailed.push(`${_t.id} (*unknown thread*)`);
        }
      }
    };

    const getChannels = async () => {
      const t = [];
      if (!interaction.guildId) return;
      const channels = await db.getChannels(interaction.guildId);

      for (const channelData of channels) {
        const channel = await interaction.client.channels.fetch(channelData.id);
        if (channel) {
          if (
            !(
              (channel instanceof TextChannel ||
                channel instanceof ForumChannel ||
                channel instanceof NewsChannel ||
                channel instanceof CategoryChannel) &&
              interaction.member instanceof GuildMember
            )
          )
            break;
          if (
            channel
              .permissionsFor(interaction.member)
              .has(PermissionFlagsBits.ViewChannel)
          ) {
            res.channels.push(getDirectTag(channel));
          }
        } else {
          res.channelsFailed.push(`${channelData.id} (*unknown channel*)`);
        }
      }
      t.push("a");
      return t;
    };

    if (show === "thread") await getThreads();
    if (show === "channel") await getChannels();
    if (show === "all") {
      await Promise.all([getThreads(), getChannels()]);
    }

    const embeds = [];

    const genEmbed = () => {
      const e = new EmbedBuilder().setColor(
        config.style.success.colour as ColorResolvable,
      );

      return e;
    };

    if (res.threads.length >= 1 || res.threadsFailed.length >= 1) {
      const fields = fitIntoFields("Threads", [
        ...res.threads,
        ...res.threadsFailed,
      ]).fieldArr;
      const chunks = Chunkable.from(fields, 20);

      let items = chunks.next();
      while (items) {
        const e = genEmbed()
          .setDescription(
            `Keeping \`${res.threads.length}\` threads Un-archived!`,
          )
          .addFields(...items);
        embeds.push(e);
        items = chunks.next();
      }
    }
    if (res.channels.length >= 1 || res.channelsFailed.length >= 1) {
      const fields = fitIntoFields("Channels", [
        ...res.channels,
        ...res.channelsFailed,
      ]).fieldArr;
      const chunks = Chunkable.from(fields, 20);

      let items = chunks.next();
      while (items) {
        const e = genEmbed()
          .setDescription(
            `Watching \`${res.channels.length}\` channels for new threads!`,
          )
          .addFields(...items);
        embeds.push(e);
        items = chunks.next();
      }
    }

    if (embeds.length === 0) {
      buildBaseEmbed(`Nothing to show`, statusType.info, {
        description: `I'd love to show you something here but you have not added anything that can be displayed with show set to \`${show}\``,
      });
      return;
    }

    interaction.editReply({ embeds });
  },
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("list your watched threads and channels")
    .addBooleanOption((o) =>
      o
        .setName("public")
        .setDescription(
          "do you want this message to be viewable for everyone?",
        ),
    )
    .addStringOption((o) =>
      o
        .setName("show")
        .setDescription("do you want to view watched threads or channels?")
        .addChoices(
          { name: "threads", value: "thread" },
          { name: "channels", value: "channel" },
          { name: "both", value: "all" },
        ),
    ),
};

export default threads;
