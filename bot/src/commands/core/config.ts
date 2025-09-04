import { component_service, logger, setting_service } from 'bot';
import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  Interaction,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import {
  Command,
  CommandError,
  CommandExecutionContext,
  GuildChatInteraction,
  RegistrationScope,
} from 'interfaces/Command';
import settings_map, { SettingSchema, SettingType, SettingValue } from 'interfaces/Settings';
import { err, ok, Result } from 'neverthrow';
import { Vacuum } from 'services/ComponentService';

function value_to_displayable(value: SettingValue | null, type: SettingType) {
  let display_as: string;

  if (!value) return '`<null>`';

  switch (type) {
    case 'channel':
      display_as = `<#${value}>`;
      break;
    case 'role':
      display_as = `<&@${value}>`;
      break;
    default:
      display_as = value?.toString() ?? '`<unknown>`';
  }

  return display_as;
}

function embed_generator<T extends SettingValue>(
  ctx: CommandExecutionContext,
  setting: SettingSchema<T>,
  default_value?: number | null,
) {
  return function (current_value: SettingValue | null) {
    return ctx.build_embed({
      title: setting.name,
      description: setting.description,
      style: 'info',
      fields: [
        { name: 'current', value: value_to_displayable(current_value, setting.type), inline: true },
        { name: 'default', value: default_value?.toString() ?? '<null>', inline: true },
      ],
    });
  };
}

async function run(
  interaction: GuildChatInteraction,
  ctx: CommandExecutionContext,
): Promise<Result<void, CommandError>> {
  const settings_key = interaction.options.getString('setting');
  if (!settings_key) return err(new Error('setting option not set'));

  const setting = settings_map.get(settings_key);

  if (!setting) return err(new Error(`\`${settings_key}\` is not a valid setting`));

  const current_value = await setting_service.get_setting_with_default(
    interaction.guildId,
    setting.key,
    setting.default,
  );
  if (!current_value.isOk()) {
    ctx.logger.error(current_value.error);
    return err(new Error('could not fetch current settings value'));
  }

  const get_embed = embed_generator(ctx, setting);

  let converted_value;
  if (current_value.value) {
    const transform_result = setting.transform_into(current_value.value);
    if (transform_result.isErr()) return err(transform_result.error);
    converted_value = transform_result.value;
  } else {
    converted_value = null;
  }

  let new_setting_value: typeof converted_value | null = converted_value;

  const apply_button = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel('Save');
  const reset_button = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('Reset');
  const cancel_button = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel('cancel');

  const action_row = new ActionRowBuilder<ButtonBuilder>();
  action_row.addComponents(apply_button, reset_button, cancel_button);

  const filter = (int: Interaction) => int.user.id === interaction.user.id;

  type ComponentTypes = ButtonBuilder | ChannelSelectMenuBuilder | RoleSelectMenuBuilder;

  let component: ComponentTypes = setting.discord_input_element();

  const cleaner = new Vacuum();
  cleaner.add(
    component_service.wait_for_interaction_callback(apply_button, filter, (response) => {
      setting_service.set_setting(interaction.guildId, setting.key, new_setting_value);

      const change_summary = ctx.build_embed({
        title: `Setting changed`,
        description: `\`${setting.name}\``,
        style: 'success',
        fields: [
          {
            name: 'from',
            value: value_to_displayable(converted_value, setting.type),
            inline: true,
          },
          {
            name: 'to',
            value: value_to_displayable(new_setting_value, setting.type),
            inline: true,
          },
        ],
      });

      change_summary.setTimestamp();
      change_summary.setAuthor({
        iconURL: interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL,
        name: interaction.user.username,
      });

      ctx.send_audit(change_summary, response);
    }),
    component_service.wait_for_interaction_callback(reset_button, filter, (value) => {
      new_setting_value = setting.default;
      const embed = get_embed(new_setting_value);

      value.update({
        embeds: [embed],
      });
    }),
    component_service.wait_for_interaction_callback(cancel_button, filter, (int) => {
      cleaner.clean();
      int.update({
        embeds: [],
        components: [],
      });
    }),
    component_service.wait_for_interaction_callback(component, filter, (value) => {
      let extracted_value;
      if (value.isAnySelectMenu()) {
        extracted_value = value.values[0];
        logger.info(new_setting_value);
      }

      if (!setting.validate(extracted_value)) {
        // TODO: handle feedback on fucked validation
      }

      if (!extracted_value) {
        // TODO: handle no value
        return;
      }

      new_setting_value = extracted_value;

      const embed = get_embed(new_setting_value);

      value.update({
        embeds: [embed],
      });
    }),
  );

  let embed = get_embed(new_setting_value);

  const input_row = new ActionRowBuilder<ComponentTypes>();
  input_row.addComponents(component);

  interaction.reply({
    embeds: [embed],
    components: [input_row, action_row],
  });

  return ok();
}

async function autocomplete(interaction: AutocompleteInteraction) {
  const settings_values = settings_map.values();
  // do some sort of filtering
  const filtered = settings_values;

  const results = filtered
    .map((setting) => {
      return { name: setting.name, value: setting.key };
    })
    .toArray();

  interaction.respond(results);

  return ok();
}

const command_data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('configure the bot :D')
  .addStringOption((o) =>
    o.setName('setting').setDescription('the setting').setAutocomplete(true).setRequired(true),
  );

const command: Command = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  run,
  autocomplete,
};

export default command;
