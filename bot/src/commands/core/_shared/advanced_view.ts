import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Channel,
  EmbedBuilder,
  Guild,
  GuildForumTagEmoji,
  Interaction,
  ModalBuilder,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  ThreadChannel,
} from 'discord.js';
import regex_is_safe from 'safe-regex';
import { Vacuum } from 'services/ComponentService';
import { CommandContext } from 'utilities/command_context';
import { FilterData } from '@watcher/shared';
import { component_service } from '@providers/services/component_service';
import { GenericCommandError } from 'utilities/error/def';
import EmbeddableError from 'utilities/error/EmbeddableError';

export interface State<TContext = unknown> {
  components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder>[];
  filters: FilterData;
  edit_mode: boolean;
  cleaner: Vacuum;
  threads: ThreadChannel[];
  target_channel: Channel | Guild;
  guild_id: string;
  _ctx: CommandContext;
  on_save: [(state: State, interaction: Interaction, context: TContext) => void, TContext];
  on_cleanup: (state: State, interaction: ButtonInteraction) => void;
}

function update_displayed_state(interaction: Interaction, state: State) {
  if (interaction.isCommand()) {
    interaction.editReply({ embeds: [create_embed(state)], components: state.components });
  } else if ('update' in interaction) {
    interaction.update({ embeds: [create_embed(state)], components: state.components });
  }
}

function create_regex_modal(state: State) {
  const modal = new ModalBuilder();
  const text_input = new TextInputBuilder();
  text_input.setCustomId('advanced_regex');
  text_input.setValue(state.filters?.regex?.source ?? '');
  text_input.setStyle(TextInputStyle.Short);
  text_input.setRequired(true);

  const regex_helper_text = state._ctx.t('advanced.regex_helper', {});
  const regex_modal_title_text = state._ctx.t('advanced.regex_modal_title', {});

  modal.addLabelComponents((c) => c.setLabel('Regex').setTextInputComponent(text_input));
  modal.addTextDisplayComponents((t) => t.setContent(regex_helper_text));
  modal.setTitle(regex_modal_title_text);

  return modal;
}

async function handle_set_regex_button(interaction: ButtonInteraction, state: State) {
  const modal_to_show = create_regex_modal(state);

  const modal_promise = component_service.wait_for_interaction(
    modal_to_show,
    (int) => int.user.id === interaction.user.id,
  );

  await interaction.showModal(modal_to_show);
  const res = await modal_promise;

  if (res.isErr()) return EmbeddableError.handle_error(interaction, new Error(res.error));

  const modal_interaction = res.value;
  const reg_exp = modal_interaction.fields.getTextInputValue('advanced_regex');

  if (!regex_is_safe(reg_exp)) {
    const error = new GenericCommandError(
      'Unsafe Regex',
      `the provided regex:\`\`\`\n${reg_exp}\n\`\`\`was deemed unsafe`,
      'usage/advanced-filtering#rejected-regex',
    );
    return error.send_error(modal_interaction);
  }

  if (modal_interaction.isFromMessage()) {
    state.filters.regex = new RegExp(reg_exp);
    update_displayed_state(modal_interaction, state);
  }
}

function handle_clear_regex_button(interaction: ButtonInteraction, state: State) {
  state.filters.regex = undefined;
  update_displayed_state(interaction, state);
}

function handle_test_regex_button(interaction: ButtonInteraction, state: State) {
  if (!state.filters.regex) {
    const error = new GenericCommandError(
      'No Regex Set',
      `You've not selected a Regex so there's nothing to test`,
    );
    return error.send_error(interaction);
  }

  const test_threads = state.threads.slice(0, 20);
  let results: { thread_name: string; passes: boolean }[] = [];

  for (const thread of test_threads) {
    const thread_passes_regex = state.filters.regex.test(thread.name);
    results.push({ thread_name: thread.name, passes: thread_passes_regex });
  }

  const result_string_list = results
    .map((result) => `- \`${result.thread_name}\`: ${result.passes}`)
    .join('\n');

  const result_embed = state._ctx.build_embed({
    title: 'Regex Test',
    description: `**regex:** \`${state.filters.regex}\`\n## Results\n${result_string_list}`,
    style: 'info',
  });

  interaction.reply({ embeds: [result_embed], flags: ['Ephemeral'] });
}

function create_button(label: string, style: ButtonStyle) {
  return new ButtonBuilder().setLabel(label).setStyle(style);
}

function create_advanced_buttons(state: State, user_id: string) {
  const buttons: ButtonBuilder[] = [];

  const t = state._ctx.t;

  const save_button = create_button(t('advanced.button.proceed'), ButtonStyle.Success);
  const cancel_button = create_button(t('advanced.button.cancel'), ButtonStyle.Secondary);
  const set_regex = create_button(t('advanced.button.set_regex'), ButtonStyle.Success);
  const clear_regex = create_button(t('advanced.button.clear_regex'), ButtonStyle.Danger);
  const test_regex = create_button(t('advanced.button.test_regex'), ButtonStyle.Secondary);

  const filter = (int: ButtonInteraction) => int.user.id === user_id;

  state.cleaner.add(
    component_service.wait_for_interaction_callback(save_button, filter, (button_interaction) => {
      const [func, context] = state.on_save;
      func(state, button_interaction, context);
    }),
    component_service.wait_for_interaction_callback(cancel_button, filter, (button_interaction) =>
      state.on_cleanup(state, button_interaction),
    ),
    component_service.wait_for_interaction_callback(set_regex, filter, (button_interaction) =>
      handle_set_regex_button(button_interaction, state),
    ),
    component_service.wait_for_interaction_callback(clear_regex, filter, (button_interaction) =>
      handle_clear_regex_button(button_interaction, state),
    ),
    component_service.wait_for_interaction_callback(test_regex, filter, (button_interaction) =>
      handle_test_regex_button(button_interaction, state),
    ),
  );

  buttons.push(save_button, cancel_button, set_regex, clear_regex, test_regex);
  component_service.set_managed_components('advanced', buttons);

  return buttons;
}

function handle_role_select(state: State, interaction: RoleSelectMenuInteraction) {
  state.filters.role_whitelist = interaction.roles
    .values()
    .map((r) => r.id)
    .toArray();
  update_displayed_state(interaction, state);
}

function create_role_select(state: State, user_id: string) {
  const role_select = new RoleSelectMenuBuilder();
  role_select.setPlaceholder(state._ctx.t('advanced.required_roles'));
  role_select.setMaxValues(25);

  if (state.filters.role_whitelist) role_select.addDefaultRoles(state.filters.role_whitelist);

  state.cleaner.add(
    component_service.wait_for_interaction_callback(
      role_select,
      (int) => int.user.id === user_id,
      (interaction) => handle_role_select(state, interaction),
    ),
  );

  const action_row = new ActionRowBuilder<RoleSelectMenuBuilder>();
  action_row.addComponents(role_select);

  return action_row;
}

function handle_tags_select(state: State, interaction: StringSelectMenuInteraction) {
  state.filters.tags = interaction.values.map((item) => item);
  update_displayed_state(interaction, state);
}

function create_tags_select(state: State, user_id: string) {
  const tag_select = new StringSelectMenuBuilder();
  tag_select.setPlaceholder(state._ctx.t('advanced.required_tags'));

  if ('availableTags' in state.target_channel) {
    tag_select.setMaxValues(Math.min(25, state.target_channel.availableTags.length));
    for (const tag of state.target_channel.availableTags) {
      tag_select.addOptions({
        value: tag.id,
        label: `${tag.emoji ? guild_tag_emoji_to_string(tag.emoji) : ''} ${tag.name}`,
        default: state.filters.tags?.includes(tag.id),
      });
    }
  }

  state.cleaner.add(
    component_service.wait_for_interaction_callback(
      tag_select,
      (int) => int.user.id === user_id,
      (interaction) => handle_tags_select(state, interaction),
    ),
  );

  const action_row = new ActionRowBuilder<StringSelectMenuBuilder>();
  action_row.addComponents(tag_select);

  return action_row;
}

function guild_tag_emoji_to_string(emoji: GuildForumTagEmoji) {
  return emoji.id ? `<${emoji.name}:${emoji.id}>` : emoji.name;
}

function resolve_tags(state: State) {
  if (!('availableTags' in state.target_channel) || !state.filters.tags) return null;

  const tags = state.target_channel.availableTags;
  const forum_tag_list = state.filters.tags.map((tag_id) => {
    const guild_tag = tags.find((tag) => tag.id === tag_id);
    if (guild_tag)
      return `${guild_tag.emoji ? guild_tag_emoji_to_string(guild_tag.emoji) : ''} ${guild_tag.name}`;
    else return `\`${tag_id}\``;
  });

  return forum_tag_list;
}

function create_embed(state: State) {
  const embed = new EmbedBuilder();
  const t = state._ctx.t;
  const NO_VALUE_TEXT = t('advanced.no_value');

  const regex_text = state.filters.regex ? `\`${state.filters.regex.source}\`` : NO_VALUE_TEXT;

  embed.addFields([
    { name: 'Regex', value: regex_text, inline: true },
    {
      name: t('advanced.roles'),
      value:
        state.filters?.role_whitelist?.map((role) => `<@&${role}>`).join(', ') ?? NO_VALUE_TEXT,
      inline: true,
    },
    {
      name: t('advanced.tags'),
      value: resolve_tags(state)?.join(',') ?? NO_VALUE_TEXT,
      inline: true,
    },
  ]);
  embed.setTitle(t('advanced.embed_title'));
  if (state.edit_mode) embed.setFooter({ text: t('advanced.edit_mode') });
  return embed;
}

export function make_advanced_embed(interaction: Interaction, state: State) {
  const [save, cancel, set_regex, delete_regex, test_regex] = create_advanced_buttons(
    state,
    interaction.user.id,
  );

  const role_select_action_row = create_role_select(state, interaction.user.id);

  const save_button_row = new ActionRowBuilder<ButtonBuilder>();
  save_button_row.addComponents(save, cancel);

  const regex_button_row = new ActionRowBuilder<ButtonBuilder>();
  regex_button_row.addComponents(set_regex, delete_regex, test_regex);

  state.components.push(regex_button_row, role_select_action_row);

  if ('availableTags' in state.target_channel && state.target_channel.availableTags.length > 0) {
    const tag_select = create_tags_select(state, interaction.user.id);
    state.components.push(tag_select);
  }

  state.components.push(save_button_row);

  update_displayed_state(interaction, state);
}
