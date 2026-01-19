import { channel_service, client, component_service, config, thread_service } from 'bot';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  DMChannel,
  EmbedBuilder,
  GuildBasedChannel,
  Interaction,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CommandError,
  GuildChatInteraction,
  RegistrationScope,
} from 'interfaces/BaseCommandInterface';
import { type Command } from 'interfaces/Command';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import { CommandContext } from 'utilities/command_context';

type DisplayType = 'THREADS' | 'CHANNELS';

function create_buttons(guild_id: string, display_as: DisplayType) {
  const url =
    `${config.web.hostname}/dashboard/${guild_id}/` +
    (display_as === 'CHANNELS' ? 'monitors' : 'threads');

  const btn_back = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setEmoji('⏪');
  const btn_next = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setEmoji('⏩');
  const btn_website_cta = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setURL(url)
    .setLabel('View Online');

  return { btn_back, btn_next, btn_website_cta };
}

interface State {
  btn_back: ButtonBuilder;
  btn_next: ButtonBuilder;
  page_generator: PageGenerator;
  embed: EmbedBuilder;
}

function set_button_states({ btn_back, btn_next, page_generator }: State) {
  btn_back.setDisabled(page_generator.page === 0);
  btn_next.setDisabled(page_generator.is_completed());
}

function set_embed_page_counter({ embed, page_generator }: State) {
  embed.setFooter({ text: page_generator.get_page_indicator() });
}

function update_state(state: State) {
  set_button_states(state);
  set_embed_page_counter(state);
}

interface FetchDataFailType {
  channel_id: string;
  error_obj: Error;
}

interface FetchDataReturn {
  succeeded: GuildBasedChannel[];
  failed: FetchDataFailType[];
}

async function fetch_data_from_id(data_list: { id: string }[]): Promise<FetchDataReturn> {
  // I feel bad 4 u if re-writing this mess.
  // sorry bud. I mean it.
  // Anyhow, past you (01/10/2025) hopes that this music might help you or something. Enjoy?
  // https://open.spotify.com/track/0lRL637hbzGVIYlz4X4a2C
  const return_values: FetchDataReturn = {
    succeeded: [],
    failed: [],
  };

  const promise_list = data_list.map((data) =>
    ResultAsync.fromPromise(client.channels.fetch(data.id), (err) => {
      return {
        error_obj: err instanceof Error ? err : new Error('something wrong big time'),
        channel_id: data.id,
      };
    }),
  );

  for (const res of await Promise.all(promise_list)) {
    if (res.isOk()) {
      // Will never happen, but skip if it does
      if (res.value instanceof DMChannel) continue;
      if (res.value) return_values.succeeded.push(res.value as GuildBasedChannel);
    } else {
      return_values.failed.push(res.error);
    }
  }

  return return_values;
}

export function create_channel_link(channel: GuildBasedChannel) {
  return `[${channel.name}](https://discord.com/channels/${channel.guildId}/${channel.id})`;
}

/**
 * @description Class that takes care of paginating the list of watched threads/channels.
 * As we don't know how many entries we can fit on a page with our char limit being `4096` we greedily create the pages as they are requested.
 * This means we don't *know* how many pages exist until all pages have been rendered as thread names vary in length
 */
class PageGenerator {
  private _page = 0;
  pages: { text: string; item_count: number }[] = [];
  private last_unread: number = 0;
  private left_overs: string[] = [];
  static GET_PER_BATCH = 10;
  static MAX_PER_PAGE = 4096;

  constructor(private items: { id: string }[]) {}

  get page() {
    return this._page;
  }

  private decr_ptr() {
    this._page = Math.max(0, this._page - 1);
  }

  get() {
    return this.pages[this._page].text;
  }

  back() {
    this.decr_ptr();
    return this.get();
  }

  is_completed() {
    return this.last_unread === this.items.length;
  }

  /**
   *
   * @returns a list of threads/channels **not exceeding** `4096` chars
   */
  async generate_page() {
    let page = '';

    let item_count = 0;
    while (this.last_unread < this.items.length) {
      const space_left_on_page = PageGenerator.MAX_PER_PAGE > page.length;
      if (!space_left_on_page) break;

      const end_index = Math.min(this.last_unread + PageGenerator.GET_PER_BATCH, this.items.length);
      const items = this.items.slice(this.last_unread, end_index);
      this.last_unread = end_index;

      const items_fetched = await fetch_data_from_id(items);
      // TODO: Handle displaying of threads that fail.
      // MIGHT just push users to web dashboard for this. Unsure yet.
      const as_links = items_fetched.succeeded.map((c) => create_channel_link(c));
      const items_to_add = [...this.left_overs, ...as_links];

      for (let i = 0; i < items_to_add.length; i++) {
        const page_len_with_current_item = page.length + items_to_add[i].length + 2;
        if (page_len_with_current_item > PageGenerator.MAX_PER_PAGE) {
          const unused_items = items_to_add.splice(i);
          this.left_overs.push(...unused_items);
          break;
        }

        item_count += 1;
        page += items_to_add[i] + ', ';
      }
    }

    page = page.substring(0, page.length - 2);

    this.pages.push({ text: page, item_count: item_count });
    return page;
  }

  async next() {
    if (this._page + 1 <= this.pages.length) {
      this._page += 1;
      return this.get();
    }

    const page = await this.generate_page();
    if (page.length > 0) {
      this._page += 1;
    }

    return page;
  }

  get_page_data() {
    const return_value = {
      is_absolute: this.is_completed(),
      current_page: this.page,
      pages: this.pages.length,
    };

    if (return_value.is_absolute) return return_value;

    const total_item_count_in_pages = this.pages
      .map((page) => page.item_count)
      .reduce((a, b) => a + b);
    const average_item_count_per_page = total_item_count_in_pages / this.pages.length;
    const speculative_max_page = Math.round(this.items.length / average_item_count_per_page);

    return_value.pages = speculative_max_page;

    return return_value;
  }

  get_page_indicator() {
    const page_data = this.get_page_data();
    return `Page ${page_data.current_page + 1} / ${!page_data.is_absolute ? '~' : ''}${page_data.pages}`;
  }
}

async function run(
  interaction: GuildChatInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  function filter_function(btn_interaction: Interaction) {
    return interaction.user.id === btn_interaction.user.id;
  }

  const display_type = (interaction.options.getString('filter') ?? 'THREADS') as DisplayType;

  const data_to_display = await (display_type === 'THREADS'
    ? thread_service.get_threads(interaction.guildId)
    : channel_service.get_channels(interaction.guildId));

  if (data_to_display.isErr()) return err(data_to_display.error);

  if (data_to_display.value.length === 0) {
    ctx.build_embed({
      title: 'No data returned',
      description: `There's nothing to show`,
      style: 'warning',
      auto_respond: true,
    });
    return ok();
  }

  await interaction.deferReply();
  const { btn_back, btn_next, btn_website_cta } = create_buttons(interaction.guildId, display_type);
  const button_row = new ActionRowBuilder<ButtonBuilder>();
  const dashboard_row = new ActionRowBuilder<ButtonBuilder>();
  button_row.addComponents(btn_back, btn_next);
  dashboard_row.addComponents(btn_website_cta);

  const page_generator = new PageGenerator(data_to_display.value);
  const page_1 = await page_generator.generate_page();

  const embed = new EmbedBuilder();
  embed.setTitle(display_type.toLowerCase());
  embed.setDescription(page_1);

  const state: State = {
    embed,
    btn_back,
    btn_next,
    page_generator,
  };

  const cleaner = new Vacuum();
  cleaner.add(
    component_service.wait_for_interaction_callback(
      btn_back,
      filter_function,
      async (interaction) => {
        await interaction.deferUpdate();
        const page = page_generator.back();
        embed.setDescription(page);

        update_state(state);

        interaction.update({
          embeds: [embed],
          components: [button_row, dashboard_row],
        });
      },
    ),
    component_service.wait_for_interaction_callback(
      btn_next,
      filter_function,
      async (interaction) => {
        const page = await page_generator.next();
        embed.setDescription(page);

        update_state(state);

        interaction.update({
          embeds: [embed],
          components: [button_row, dashboard_row],
        });
      },
    ),
  );

  update_state(state);

  interaction.editReply({
    embeds: [embed],
    components: [button_row, dashboard_row],
  });

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List all watched threads, monitors, or both')
  .addStringOption((o) =>
    o
      .addChoices([
        { name: 'Threads', value: 'THREADS' },
        { name: 'Monitors', value: 'CHANNELS' },
      ])
      .setName('filter')
      .setDescription('Filter the list by type (default: Threads)'),
  )
  .addBooleanOption((o) =>
    o
      .setName('private')
      .setDescription('Hide the list from others (default: True, only you can see it)'),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
};

export default command;
