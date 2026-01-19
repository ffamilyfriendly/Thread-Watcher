import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  Interaction,
  MessageActionRowComponentBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import {
  CommandError,
  GuildChatInteraction,
  RegistrationScope,
} from 'interfaces/BaseCommandInterface';
import { type Command } from 'interfaces/Command';
import settings_map from 'interfaces/Settings';
import { err, ok, Result } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';
import { CommandContext } from 'utilities/command_context';
import {
  create_initial_state,
  generate_embed,
  handle_apply_callback,
  handle_cancel_button,
  handle_default_button,
} from 'commands/core/_shared/config';
import { map_err } from 'utilities/error';
import { safe_parse } from 'utilities/parsing';
import { setting_service } from '@providers/services/setting_service';
import { component_service } from '@providers/services/component_service';

function create_buttons() {
  const apply_button = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Save');
  const reset_button = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('Reset');
  const cancel_button = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel('Cancel');
  const action_row = new ActionRowBuilder<ButtonBuilder>();
  action_row.addComponents(apply_button, reset_button, cancel_button);

  return {
    apply_button,
    reset_button,
    cancel_button,
    action_row,
  };
}

async function run(
  interaction: GuildChatInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  const cleaner = new Vacuum();
  const filter = (int: Interaction) => int.user.id === interaction.user.id;

  return new Promise(async (resolve) => {
    const settings_key = interaction.options.getString('setting');
    if (!settings_key) return resolve(err(new Error('setting option not set')));

    const setting = settings_map.get(settings_key);

    if (!setting) return resolve(err(new Error(`\`${settings_key}\` is not a valid setting`)));

    const current_value = await setting_service.get_setting(interaction.guildId, setting.key);

    if (current_value.isErr()) {
      return resolve(err(map_err(current_value.error)));
    }

    const current_val = (
      await setting_service.get_setting(interaction.guildId, setting.key)
    ).unwrapOr(setting.default);
    const state = create_initial_state(current_val);

    const { apply_button, reset_button, cancel_button, action_row } = create_buttons();
    let component = setting.adapter.create_component();
    const input_row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    input_row.addComponents(component);

    cleaner.add(
      component_service.wait_for_interaction_callback(apply_button, filter, (response) => {
        handle_apply_callback(response, ctx, setting, state);
        ctx.ok();
        cleaner.clean();
        resolve(ok());
      }),
      component_service.wait_for_interaction_callback(reset_button, filter, (response) =>
        handle_default_button(response, setting, state, ctx),
      ),
      component_service.wait_for_interaction_callback(cancel_button, filter, (response) => {
        handle_cancel_button(response);
        cleaner.clean();
        resolve(ok());
      }),

      component_service.wait_for_interaction_callback(component, filter, (response) => {
        setting.adapter
          .parse_interaction(response)
          .andThen((val) => safe_parse(setting.schema, val))
          .match(
            (validated_val) => {
              state.value = validated_val;
              response.update({ embeds: [generate_embed(ctx, setting, state)] });
            },
            (error) => {
              ctx.err(error);
            },
          );
      }),
    );

    let embed = generate_embed(ctx, setting, state);

    interaction.reply({
      embeds: [embed],
      components: [action_row, input_row],
      flags: 'Ephemeral',
    });

    return ctx.get_execution_promise();
  });
}

async function autocomplete(interaction: AutocompleteInteraction) {
  const settings_values = Array.from(settings_map.values());
  const query = interaction.options.getFocused();

  const filtered = query
    ? settings_values.filter(
        (item) =>
          item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
      )
    : settings_values;

  const results = filtered.map((setting) => {
    return { name: setting.name, value: setting.key };
  });

  interaction.respond(results.slice(0, 25));

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configure bot settings and preferences')
  .addStringOption((o) =>
    o
      .setName('setting')
      .setDescription('The setting you want to configure (use autocomplete)')
      .setAutocomplete(true)
      .setRequired(true),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
  autocomplete,
};

export default command;
