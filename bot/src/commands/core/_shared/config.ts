import { audit_service, setting_service } from 'bot';
import { ButtonInteraction } from 'discord.js';
import { SettingSchema, SettingValue } from 'interfaces/Settings';
import { CommandContext } from 'utilities/command_context';

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
  ctx: CommandContext,
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

export async function handle_apply_callback<T extends SettingValue>(
  response: ButtonInteraction,
  ctx: CommandContext,
  setting: SettingSchema<T>,
  state: State<T>,
) {
  if (!response.inGuild()) return;
  setting_service.set_setting(response.guildId, setting.key, state.value);
  const log = await audit_service.log_event('CONFIG_UPDATE', response.guildId, response.user.id, {
    old_value: setting.adapter.display_value(state.old_value),
    new_value: setting.adapter.display_value(state.value),
    reason: setting.key,
  });

  if (log.isErr()) return ctx.err(log.error);

  ctx.send_audit(log.value, response);
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
  ctx: CommandContext,
) {
  state.value = setting.default;
  const embed = generate_embed(ctx, setting, state);

  response.update({
    embeds: [embed],
  });
}
