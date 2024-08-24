import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  SlashCommandBuilder,
  ThreadChannel,
  CategoryChannel,
  TextChannel,
  ForumChannel,
  NewsChannel,
  FetchedThreads,
  FetchedThreadsMore,
  MediaChannel,
  Role,
  GuildForumTag,
  ActionRowBuilder,
  SelectMenuBuilder,
  ButtonStyle,
  ButtonInteraction,
  StringSelectMenuOptionBuilder,
  AnySelectMenuInteraction,
} from "discord.js";
import { Command, statusType } from "../../interfaces/command";
import { db, threads as threadsList } from "../../bot";
import { threadShouldBeWatched } from "../../events/threadCreate";
import { strToRegex, validRegex } from "../../utilities/regex";
import {
  addThread,
  dueArchiveTimestamp,
  removeThread,
} from "../../utilities/threadActions";
import TwButton from "../../components/Button";
import TwModal from "../../components/Modal";
import Chunkable from "../../utilities/Chunkable";
import TwStringSelect from "../../components/StringSelect";

type threadContainers = TextChannel | NewsChannel | ForumChannel | MediaChannel;

interface actionsList {
  added: ThreadChannel[];
  removed: ThreadChannel[];
  noAction: ThreadChannel[];
}

type actionType = "watch" | "unwatch" | "toggle" | "inaction";

interface filterTypes {
  roles: (Role | undefined | null)[];
  tags: (GuildForumTag | undefined)[];
  regex: string;
}

const getThreads = async function (
  channel: threadContainers,
): Promise<ThreadChannel[]> {
  const threads: ThreadChannel[] = [];
  const promises: Promise<FetchedThreads | FetchedThreadsMore>[] = [];

  if (!channel.viewable) throw Error("can not view channel");

  // Fetch all the active threads for the channel
  promises.push(channel.threads.fetchActive());

  // Fetch all the archived threads for the channel. This requires the bot has "ReadMessageHistory"
  if (
    channel.guild.members.me &&
    channel
      .permissionsFor(channel.guild.members.me)
      .has(PermissionFlagsBits.ReadMessageHistory)
  )
    promises.push(channel.threads.fetchArchived());

  const resolvedThreads = await Promise.all(promises).catch(() => {
    return [];
  });

  // for some reason this needs to be done as ALL threads in the server are returned???
  // I've no clue why as docs specify that channel.threads.fetch<Active|Archived>() only returns threads of that channel
  for (const resolved of resolvedThreads)
    threads.push(
      ...resolved.threads.filter((t) => t.parentId == channel.id).values(),
    );

  return threads;
};

const handleThreadActioning = async (
  threads: ThreadChannel[],
  action: actionType,
  filters: filterTypes,
): Promise<actionsList> => {
  const rv: actionsList = {
    added: [],
    removed: [],
    noAction: [],
  };

  for (const thread of threads) {
    if (
      await threadShouldBeWatched(
        {
          id: thread.id,
          server: thread.guildId,
          regex: filters.regex ?? "",
          roles: filters.roles.map((r) => r?.id),
          tags: filters.tags.map((t) => t?.id),
        },
        thread,
      )
    ) {
      switch (action) {
        case "inaction":
          rv.noAction.push(thread);
          break;
        case "watch":
          if (!threadsList.get(thread.id)?.watching) {
            addThread(
              thread.id,
              dueArchiveTimestamp(
                thread.autoArchiveDuration ?? 0,
                thread.lastMessage?.createdAt,
              ),
              thread.guildId,
            );
            rv.added.push(thread);
          } else {
            rv.noAction.push(thread);
          }
          break;
        case "unwatch":
          if (threadsList.has(thread.id)) {
            removeThread(thread.id);
            rv.removed.push(thread);
          } else {
            rv.noAction.push(thread);
          }
          break;
        case "toggle":
          if (threadsList.has(thread.id)) {
            removeThread(thread.id);
            rv.removed.push(thread);
          } else {
            addThread(
              thread.id,
              dueArchiveTimestamp(
                thread.autoArchiveDuration ?? 0,
                thread.lastMessage?.createdAt,
              ),
              thread.guildId,
            );
            rv.noAction.push(thread);
          }
          break;
      }
    }
  }

  return rv;
};

const getDirThreads = async (
  dir: CategoryChannel,
): Promise<ThreadChannel[]> => {
  const threads: ThreadChannel[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [_idx, channel] of dir.children.cache) {
    if (!channel) continue;
    if (
      !(
        channel instanceof TextChannel ||
        channel instanceof NewsChannel ||
        channel instanceof ForumChannel
      )
    )
      continue;

    const chanThreads = await getThreads(channel);

    if (chanThreads) threads.push(...chanThreads);
  }

  return threads;
};

const batch: Command = {
  run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
    const parent =
      interaction.options.getChannel("parent") || interaction.channel;
    const advanced = interaction.options.getBoolean("advanced");
    const watchNew = interaction.options.getBoolean("watch-new");
    let action: actionType = "inaction";
    const embeds: EmbedBuilder[] = [];

    switch (interaction.options.getString("action")) {
      case "toggle":
        action = "toggle";
        break;
      case "watch":
        action = "watch";
        break;
      case "unwatch":
        action = "unwatch";
        break;
      default:
        action = "inaction";
    }

    const buildActionList = (actions: actionsList) => {
      let rv = "";

      if (actions.added.length !== 0)
        rv += `**Threads watched:** \`${actions.added.length}\`\n`;
      if (actions.removed.length !== 0)
        rv += `**Threads unwatched:** \`${actions.removed.length}\`\n`;
      if (actions.noAction.length !== 0)
        rv += `**Threads not affected:** \`${actions.noAction.length}\`\n`;

      return rv;
    };

    const sendResultsEmbed = (actions: actionsList) => {
      const resultEmbed = buildBaseEmbed("Done", statusType.success, {
        noSend: true,
        description: `new threads created in <#${parent?.id}> ${watchNew ? "will" : "will not"} be watched\n-# **Keep in mind:** it might take upwards of an hour for the bot to ressurect any threads watched`,
        fields: [
          {
            name: "Threads actioned",
            value: buildActionList(actions),
          },
        ],
      });

      embeds.push(resultEmbed);

      interaction.editReply({ embeds, components: [] });
    };

    const buttonFilter = (int: ButtonInteraction) =>
      int.user.id === interaction.user.id;

    if (
      !(
        parent instanceof TextChannel ||
        parent instanceof NewsChannel ||
        parent instanceof ForumChannel ||
        parent instanceof CategoryChannel
      )
    ) {
      buildBaseEmbed("Wrong Channel Type", statusType.error, {
        description: `<#${parent?.id}> is not a valid channel for this command`,
        ephermal: true,
      });
      return;
    }

    if (!parent.viewable) {
      buildBaseEmbed("Cannot view channel", statusType.error, {
        description: `Thread-Watcher cannot see <#${parent.id}>. Make sure the bot has the \`View Channel\` permission in the channel.`,
        ephermal: true,
      });
      return;
    }

    if (!action || !interaction.guildId) {
      buildBaseEmbed("Rare Easter Egg", statusType.warning, {
        description:
          "Congrats! 🎉\nThis error should be impossible to get but you got it anyhow you silly little sausage.",
      });
      return;
    }

    await interaction.deferReply();

    const threads: ThreadChannel[] = [];

    // put all the affected threads into a flat array
    if (parent instanceof CategoryChannel)
      threads.push(...(await getDirThreads(parent)));
    else threads.push(...(await getThreads(parent)));

    // put all the roles into a chunkable (such a good class wow must have been a genious who made that)
    const roles = Chunkable.from(
      Array.from(interaction.guild?.roles.cache.values() ?? []),
    );

    const filters: filterTypes = {
      roles: [],
      tags: [],
      regex: "",
    };

    // This is against the law but I do not care for i am the code bandit herherherhehrherherherhreuh
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [];

    if (advanced) {
      const filterEmbed = buildBaseEmbed("Filter Options", statusType.info, {
        noSend: true,
        description: `
                            The bot will only handle threads that match the criteria set by you below.

                            <:arrow_right:1197893896416538695> If multiple roles are selected, the thread owner **needs only one** for the thread to be watched
                            <:arrow_right:1197893896416538695> The same is true for post tags
                        `,
      });

      const regexRowComponents = new ActionRowBuilder();
      const rolesSelectComponents = new ActionRowBuilder<SelectMenuBuilder>();
      const rolesRowNavigationComponents = new ActionRowBuilder();
      const tagsSelectComponents = new ActionRowBuilder<SelectMenuBuilder>();
      const confirmationButtonComponents = new ActionRowBuilder();

      embeds.push(filterEmbed);
      components.push(
        regexRowComponents,
        rolesSelectComponents,
        rolesRowNavigationComponents,
      );

      if (parent instanceof ForumChannel && parent.availableTags.length !== 0) {
        components.push(tagsSelectComponents);
      }

      components.push(confirmationButtonComponents);

      const genEmbedFields = () => {
        filterEmbed.setFields([
          {
            name: "Roles",
            value:
              filters.roles.map((r) => `<@&${r?.id}>`).join(", ") ||
              "none selected",
            inline: true,
          },
          {
            name: "Tags",
            value:
              filters.tags.map((t) => `${t?.name}`).join(", ") ||
              "none selected",
            inline: true,
          },
          {
            name: "Pattern",
            value: `\`${filters.regex}\``,
            inline: true,
          },
        ]);
      };

      const updateEmbed = (i: ButtonInteraction | AnySelectMenuInteraction) => {
        genEmbedFields();
        interaction.editReply({ embeds: [filterEmbed], components });

        if (!i.replied) {
          i.update("asdasd");
        }
      };

      const tagsSelect = () => {
        if (!(parent instanceof ForumChannel)) return;
        console.log(parent.availableTags);
        const select = new TwStringSelect();
        select.select
          .setPlaceholder("select tags!")
          .setMinValues(1)
          .setMaxValues(parent.availableTags.length);

        for (const i of parent.availableTags) {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(i.name)
            .setDescription(`${i.id}`)
            .setValue(i.id);
          select.select.addOptions(option);
        }

        select.filter = (i) => i.user.id === interaction.user.id;
        select.onSubmit((i) => {
          filters.tags = i.values.map((tagId) =>
            parent.availableTags.find((tag) => tag.id === tagId),
          );
          updateEmbed(i);
        });

        tagsSelectComponents.addComponents(select.select);
      };

      const roleNavigation = () => {
        let rolesPage = roles.current;

        const select = new TwStringSelect();

        const setSelectValues = () => {
          if (rolesPage.length === 0) return;
          select.select
            .setPlaceholder("select roles!")
            .setMinValues(1)
            .setMaxValues(rolesPage.length)
            .setOptions([]);

          for (const i of rolesPage) {
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(i.name)
              .setDescription(
                Math.random() > 0.995
                  ? "wow an easter egg???"
                  : `${i.members.size} members has this role`,
              )
              .setValue(i.id);

            select.select.addOptions(option);
          }
        };

        setSelectValues();

        const nextButton = new TwButton("next", ButtonStyle.Secondary, {
          emoji: "▶",
        });
        const prevButton = new TwButton("prev", ButtonStyle.Secondary, {
          emoji: "◀",
        });
        const clearButton = new TwButton("clear", ButtonStyle.Danger, {
          emoji: "🗑️",
        });

        nextButton.filter = buttonFilter;
        prevButton.filter = buttonFilter;
        clearButton.filter = buttonFilter;
        select.filter = (i) => i.user.id === interaction.user.id;
        clearButton.button.setDisabled(true);

        clearButton.onclick((i) => {
          filters.roles = [];
          clearButton.button.setDisabled(true);
          updateEmbed(i);
        });

        nextButton.onclick((i) => {
          rolesPage = roles.forwards();
          setSelectValues();
          updateEmbed(i);
        });

        prevButton.onclick((i) => {
          rolesPage = roles.back();
          setSelectValues();
          updateEmbed(i);
        });

        select.onSubmit((i) => {
          filters.roles.push(
            ...i.values.map((rId) => i.guild?.roles.cache.get(rId)),
          );
          clearButton.button.setDisabled(false);
          updateEmbed(i);
        });

        rolesRowNavigationComponents.addComponents(
          prevButton.button,
          clearButton.button,
          nextButton.button,
        );
        rolesSelectComponents.addComponents(select.select);
      };

      const regexButtons = () => {
        const setButton = new TwButton("Select Pattern", ButtonStyle.Primary);
        const tryButton = new TwButton("Try Pattern", ButtonStyle.Secondary);
        const clearButton = new TwButton("Clear Pattern", ButtonStyle.Danger);

        setButton.filter = buttonFilter;
        tryButton.filter = buttonFilter;
        clearButton.filter = buttonFilter;
        tryButton.button.setDisabled(true);
        clearButton.button.setDisabled(true);

        setButton.onclick((i) => {
          const modal = new TwModal("Enter Pattern");
          modal.addInput("pattern", "pattern");
          modal.filter = (i) => i.user.id === interaction.user.id;

          modal.onSubmit((response) => {
            const ptrn = response.fields.getTextInputValue("pattern");

            const isRegexValid = validRegex(ptrn);

            if (isRegexValid.valid) {
              filters.regex = ptrn;
              response.reply({
                ephemeral: true,
                content: "saved",
              });
            } else {
              /**
               * TODO: update docs link for patterns
               */
              const embed = buildBaseEmbed("Syntax Error", statusType.error, {
                noSend: true,
                description: `the pattern you provided (\`${ptrn}\`) is not valid due to ${isRegexValid.reason}. Read the documentation on [**patterns**](https://example.com) for more info!`,
              });
              response.reply({
                ephemeral: true,
                embeds: [embed],
              });
            }

            clearButton.button.setDisabled(false);
            tryButton.button.setDisabled(false);

            updateEmbed(i);
          });

          i.showModal(modal.modal);
        });

        clearButton.onclick((i) => {
          filters.regex = "";
          clearButton.button.setDisabled(true);
          tryButton.button.setDisabled(false);
          updateEmbed(i);
        });

        tryButton.onclick((i) => {
          const testThreads = threads.slice(0, 10);

          const regex = strToRegex(filters.regex);
          const e = buildBaseEmbed("Test Results", statusType.info, {
            noSend: true,
            description: `pattern: \`${filters.regex}\` ${regex.inverted ? "**(INVERTED)**" : ""}`,
          });

          e.addFields({
            name: "Results",
            value: ` ${testThreads.map((e) => `**${e.name}**: ${regex.regex.test(e.name) != regex.inverted}`).join("\n")} `,
          });

          i.reply({ embeds: [e], ephemeral: true });
        });

        regexRowComponents.addComponents(
          setButton.button,
          clearButton.button,
          tryButton.button,
        );
      };

      const confirmButtons = () => {
        // confirmationButtonComponents
        const confirm = new TwButton("Confirm Choices", ButtonStyle.Success);
        const cancel = new TwButton("Cancel", ButtonStyle.Danger);

        confirm.filter = buttonFilter;
        cancel.filter = buttonFilter;

        cancel.onclick((i) => {
          const e = buildBaseEmbed("Cancelled!", statusType.warning, {
            noSend: true,
          });
          i.update({ embeds: [e], components: [] });
        });

        confirm.onclick(async (i) => {
          filterEmbed.setColor("Green");
          i.update({ embeds: [filterEmbed], components: [] });

          // HELLO FUTURE ME!!!
          /*
                        this is where we call the function that does the stuff to the thread (/batch functionality)
                        as well as write it to db (/auto functionality). We must also remember to immedietly call that
                        if advanced is not used
                    */

          const result = await handleThreadActioning(threads, action, filters);
          if (watchNew) {
            const alreadyExists = (await db.getChannels(parent.id)).find(
              (t) => t.id == parent.id,
            );

            // If filter alr exists for this channel we go ahead and delete it
            // this so the insertion we make later does not cause any oopsie poopsies
            if (alreadyExists) await db.deleteChannel(parent.id);

            db.insertChannel({
              id: parent.id,
              server: interaction.guildId ?? "",
              regex: filters.regex,
              tags: filters.tags.map((t) => t?.id),
              roles: filters.roles.map((r) => r?.id),
            });
          }

          sendResultsEmbed(result);
          //i.reply("ok :D")
        });

        confirmationButtonComponents.addComponents(
          confirm.button,
          cancel.button,
        );
      };

      regexButtons();
      roleNavigation();
      tagsSelect();
      confirmButtons();
      genEmbedFields();

      interaction.editReply({
        embeds: [filterEmbed],
        components: [...components],
      });

      // For debugging
      return;
    } else {
      const result = await handleThreadActioning(threads, action, filters);
      if (watchNew) {
        const alreadyExists = (await db.getChannels(parent.id)).find(
          (t) => t.id == parent.id,
        );

        // If filter alr exists for this channel we go ahead and delete it
        // this so the insertion we make later does not cause any oopsie poopsies
        if (alreadyExists) await db.deleteChannel(parent.id);

        db.insertChannel({
          id: parent.id,
          server: interaction.guildId,
          regex: filters.regex,
          tags: filters.tags.map((t) => t?.id),
          roles: filters.roles.map((r) => r?.id),
        });
      }
      sendResultsEmbed(result);
    }
  },
  data: new SlashCommandBuilder()
    .setName("batch")
    .setDescription("watch or unwatch multiple threads at once")
    .addStringOption((o) =>
      o
        .setName("action")
        .setDescription("what action to run on selected threads")
        .setChoices(
          ...[
            { name: "watch", value: "watch" },
            { name: "unwatch", value: "unwatch" },
            { name: "toggle", value: "toggle" },
            { name: "nothing", value: "nothing" },
          ],
        )
        .setRequired(true),
    )
    .addBooleanOption((o) =>
      o.setName("advanced").setDescription("if you want more options"),
    )
    .addBooleanOption((o) =>
      o
        .setName("watch-new")
        .setDescription("will automatically watch new threads"),
    ),
  gatekeeping: {
    userPermissions: [PermissionFlagsBits.ManageThreads],
    ownerOnly: false,
    devServerOnly: true,
  },
  externalOptions: [
    {
      channel_types: [0, 4, 5, 15, 16],
      description: "parent whose children will be affected",
      name: "parent",
      type: 7,
    },
  ],
};

export default batch;
