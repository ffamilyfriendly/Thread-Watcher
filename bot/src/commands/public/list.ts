/* eslint-disable @typescript-eslint/no-empty-function */
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
  ActionRowBuilder,
  ButtonStyle,
  ButtonBuilder,
  Interaction,
  ButtonInteraction,
} from "discord.js";
import { Command } from "../../interfaces/command";
import { db, config } from "../../bot";
import Chunkable from "../../utilities/Chunkable";
import TwButton from "../../components/Button";

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
): { fieldArr: field[]; totalLength: number } => {
  // Embed limits https://discord.com/developers/docs/resources/channel#embed-object-embed-limits
  const MAXLENGTH = 1024;

  const fields: field[] = [];
  let buff = "";

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

  return { fieldArr: fields, totalLength };
};

export function getDirectTag(
  c: ThreadChannel | TextChannel | ForumChannel | NewsChannel | CategoryChannel,
) {
  return `[#${c.name}](https://discord.com/channels/${c.guildId}/${c.id})`;
}

interface I_Entry {
  text: string;
  id: string;
}
interface I_DataResponse {
  okValues: I_Entry[];
  failValues: I_Entry[];
}

const getChannels = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guildId) return { okValues: [], failValues: [] };
  const returnValues: I_DataResponse = { okValues: [], failValues: [] };
  const channels = await db.getChannels(interaction.guildId);

  for (const channelData of channels) {
    const channel = await interaction.client.channels
      .fetch(channelData.id)
      .catch(() => {});
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
        returnValues.okValues.push({
          text: getDirectTag(channel),
          id: channel.id,
        });
      }
    } else {
      returnValues.failValues.push({
        text: `${channelData.id} (*unknown channel*)`,
        id: channelData.id,
      });
    }
  }
  return returnValues;
};

const getThreads = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guildId) return { okValues: [], failValues: [] };
  const returnValues: I_DataResponse = { okValues: [], failValues: [] };

  const threads = await db.getThreads(interaction.guildId);
  for (const _t of threads) {
    const thread = await interaction.client.channels
      .fetch(_t.id)
      .catch(() => {});
    if (thread) {
      if (
        thread.type !== ChannelType.PrivateThread &&
        thread.type !== ChannelType.PublicThread
      )
        return;
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ViewChannel))
        continue;
      if (!_t.watching) continue;
      // This is used instead of hotlinking ( <#ID> ) as discord shows un-cached threads as #deleted-channel if not in sidebar
      // even when thread is un-archived
      returnValues.okValues.push({ text: getDirectTag(thread), id: thread.id });
    } else {
      returnValues.failValues.push({
        text: `${_t.id} (*unknown thread*)`,
        id: _t.id,
      });
    }
  }

  return returnValues;
};

const threads: Command = {
  run: async (interaction: ChatInputCommandInteraction) => {
    let pub = interaction.options.getBoolean("public");
    const show = interaction.options.getString("show") || "thread";

    // Only allow users with ManageThreads to create public /threads messages
    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageThreads) &&
      pub
    )
      pub = false;

    await interaction.deferReply({ ephemeral: !(pub || false) });

    const res =
      show == "channel"
        ? await getChannels(interaction)
        : // This function will always return I_DataResponse.
          ((await getThreads(interaction)) as I_DataResponse);

    const fields = fitIntoFields(show, [
      ...res.okValues.map((v) => v.text),
      ...res.failValues.map((v) => v.text),
    ]).fieldArr;

    const chunks = Chunkable.from(fields, 5);

    function display(btnInteraction?: ButtonInteraction) {
      const embed = new EmbedBuilder().setColor(
        config.style.success.colour as ColorResolvable,
      );

      const navCompontents = new ActionRowBuilder<ButtonBuilder>();

      const filter = (i: Interaction) => i.user.id === interaction.user.id;

      const back = new TwButton("<", ButtonStyle.Primary, {
        disabled: chunks.currentPointer === 0,
      });
      back.filter = filter;
      const forwards = new TwButton(">", ButtonStyle.Primary, {
        disabled: chunks.currentPointer === chunks.pages - 1,
      });
      forwards.filter = filter;
      navCompontents.addComponents(back.button, forwards.button);

      embed.setFields(chunks.current);
      embed.setFooter({
        text: `Page ${chunks.currentPointer + 1}/${chunks.pages}`,
      });

      forwards.onclick((i) => {
        chunks.next();
        display(i);
      });

      back.onclick((i) => {
        chunks.back();
        display(i);
      });

      if (btnInteraction) {
        btnInteraction.update({
          embeds: [embed],
          components: [navCompontents],
        });
      } else {
        interaction.editReply({
          embeds: [embed],
          components: [navCompontents],
        });
      }
    }

    display();
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
        ),
    ),
};

export default threads;
