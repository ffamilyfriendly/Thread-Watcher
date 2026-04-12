import { config } from '@providers/config';
import { setting_service } from '@providers/services/setting_service';
import { ButtonInteraction, ColorResolvable } from 'discord.js';
import { CommandContext } from '#/interfaces/Command';
import { is_setting_key, SettingSchema, SettingValue } from '#/interfaces/Settings';
import { err, ok } from 'neverthrow';
import { AuditMeta } from '#/services/AuditService';
import { safe_delete, safe_update } from '#/utilities/interaction_helpers';

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
  const e = ctx.build_embed('info');
  e.setTitle(setting.name);
  e.setDescription(setting.description);
  e.setFields([
    {
      name: 'Current',
      value: state.value ? setting.adapter.display_value(state.value) : '`<null>`',
      inline: true,
    },
    {
      name: 'Default',
      value: setting.default ? setting.adapter.display_value(setting.default) : '`<null>`',
      inline: true,
    },
  ]);
  return e;
}

export async function handle_apply_callback<T extends SettingValue>(
  response: ButtonInteraction,
  ctx: CommandContext,
  setting: SettingSchema<T>,
  state: State<T>,
) {
  if (!response.inGuild()) return;
  let setting_result;

  // If the new setting value is null we're deleting the row instead of setting the value to null
  const audit_value: AuditMeta = { executor_id: response.user.id, guild_id: response.guildId };
  if (state.value) {
    if (!is_setting_key(setting.key)) return ok();
    setting_result = await setting_service.set_setting(
      response.guildId,
      setting.key,
      state.value,
      audit_value,
    );
  } else {
    setting_result = await setting_service.remove_setting(
      response.guildId,
      setting.key,
      audit_value,
    );
  }

  if (setting_result.isErr()) return err(setting_result.error);

  const embed = generate_embed(ctx, setting, state);
  embed.setColor(config.style.success.colour as ColorResolvable);
  embed.setTitle(ctx.t('commands.config.saved_title'));

  return safe_update(response, { embeds: [embed], components: [] });
}

export function handle_cancel_button(response: ButtonInteraction) {
  safe_delete(response);
}

export function handle_default_button<T extends SettingValue>(
  response: ButtonInteraction,
  setting: SettingSchema<T>,
  state: State<T>,
  ctx: CommandContext,
) {
  state.value = setting.default;
  const embed = generate_embed(ctx, setting, state);

  safe_update(response, { embeds: [embed] });
}
