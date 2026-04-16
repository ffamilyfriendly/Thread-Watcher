import { config } from '@providers/config';
import { setting_service } from '@providers/services/setting_service';
import { ButtonInteraction, ColorResolvable } from 'discord.js';
import { CommandContext } from '#/interfaces/Command';
import { Settings } from '@watcher/shared';
import { err, ok } from 'neverthrow';
import { AuditMeta } from '#/services/AuditService';
import { safe_delete, safe_update } from '#/utilities/interaction_helpers';
import { get_adapter } from '#/interfaces/Settings';

interface State<K extends Settings.SettingKey> {
  value: Settings.SettingOutput<K> | null;
  old_value: Settings.SettingOutput<K> | null;
}

export function create_initial_state<K extends Settings.SettingKey>(
  value: Settings.SettingOutput<K> | null,
): State<K> {
  return {
    value,
    old_value: value,
  };
}

export function generate_embed<K extends Settings.SettingKey>(
  ctx: CommandContext,
  key: K,
  state: State<K>,
) {
  const setting = Settings.SETTINGS[key];
  const adapter = get_adapter(key);

  const e = ctx.build_embed('info');
  e.setTitle(setting.name);
  e.setDescription(setting.description);

  e.setFields([
    {
      name: 'Current',
      value: state.value !== null ? adapter.display_value(state.value) : '`<null>`',
      inline: true,
    },
    {
      name: 'Default',
      value: setting.default !== null ? adapter.display_value(setting.default as any) : '`<null>`',
      inline: true,
    },
  ]);
  return e;
}

export async function handle_apply_callback<K extends Settings.SettingKey>(
  response: ButtonInteraction,
  ctx: CommandContext,
  key: K,
  state: State<K>,
) {
  if (!response.inGuild()) return;

  const audit_value: AuditMeta = { executor_id: response.user.id, guild_id: response.guildId };
  let setting_result;

  if (state.value !== null) {
    setting_result = await setting_service.set_setting(
      response.guildId,
      key,
      state.value,
      audit_value,
    );
  } else {
    setting_result = await setting_service.remove_setting(response.guildId, key, audit_value);
  }

  if (setting_result.isErr()) return err(setting_result.error);

  const embed = generate_embed(ctx, key, state);
  embed.setColor(config.style.success.colour as ColorResolvable);
  embed.setTitle(ctx.t('commands.config.saved_title'));

  return safe_update(response, { embeds: [embed], components: [] });
}

export function handle_cancel_button(response: ButtonInteraction) {
  safe_delete(response);
}

export function handle_default_button<K extends Settings.SettingKey>(
  response: ButtonInteraction,
  key: K,
  state: State<K>,
  ctx: CommandContext,
) {
  const setting = Settings.SETTINGS[key];
  state.value = setting.default as Settings.SettingOutput<K>;

  const embed = generate_embed(ctx, key, state);
  safe_update(response, { embeds: [embed] });
}
