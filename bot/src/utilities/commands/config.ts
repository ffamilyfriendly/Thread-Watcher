import { setting_service } from 'bot';
import { ButtonInteraction } from 'discord.js';
import { CommandExecutionContext } from 'interfaces/Command';
import { SettingSchema, SettingValue } from 'interfaces/Settings';

interface State<T = SettingValue> {
  value: T | null;
  old_value: T | null;
}

export function create_initial_state<T = SettingValue>(value: T | null): State<T> {
  return {
    value,
    old_value: value,
  };
}

export function generate_embed<T extends SettingValue>(
  ctx: CommandExecutionContext,
  setting: SettingSchema<T>,
  state: State<T>,
) {
  return ctx.build_embed({
    title: setting.name,
    description: setting.description,
    style: 'info',
    fields: [
      { name: 'Current', value: setting.adapter.display_value(state.value), inline: true },
      { name: 'Default', value: setting.adapter.display_value(setting.default), inline: true },
    ],
  });
}

export function handle_apply_callback<T extends SettingValue>(
  response: ButtonInteraction,
  ctx: CommandExecutionContext,
  setting: SettingSchema<T>,
  state: State<T>,
) {
  if (!response.inGuild()) return;
  setting_service.set_setting(response.guildId, setting.key, state.value);

  const change_summary = ctx.build_embed({
    title: `Setting changed`,
    description: `\`${setting.name}\``,
    style: 'success',
    fields: [
      {
        name: 'From',
        value: setting.adapter.display_value(state.old_value),
        inline: true,
      },
      {
        name: 'To',
        value: setting.adapter.display_value(state.value),
        inline: true,
      },
    ],
  });

  change_summary.setTimestamp();
  change_summary.setAuthor({
    iconURL: response.user.avatarURL() ?? response.user.defaultAvatarURL,
    name: response.user.username,
  });

  ctx.send_audit(change_summary, response);
}

export function handle_cancel_button(response: ButtonInteraction) {
  response.update({
    components: [],
    content: '-# cancelled',
  });
}

export function handle_default_button<T extends SettingValue>(
  response: ButtonInteraction,
  setting: SettingSchema<T>,
  state: State<T>,
  ctx: CommandExecutionContext,
) {
  state.value = setting.default;
  const embed = generate_embed(ctx, setting, state);

  response.update({
    embeds: [embed],
  });
}
