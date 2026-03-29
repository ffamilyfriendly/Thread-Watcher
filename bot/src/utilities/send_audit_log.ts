import { client } from '@providers/client';
import { config } from '@providers/config';
import { setting_service } from '@providers/services/setting_service';
import { AuditData } from '@watcher/shared';
import { ColorResolvable, EmbedBuilder, Message } from 'discord.js';
import { AppEventKey, AppEventMap } from 'events/bus';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from './error';
import i18next from 'i18next';
import { logger } from '@providers/logger';

type i18n_func = (key: string, obj?: { [key: string]: unknown }) => string;
type embed_gen = (audit: any, embed: EmbedBuilder, t: i18n_func) => EmbedBuilder;

type ConfigLog = AuditData & { data: Extract<AuditData['data'], { audit_type: 'CONFIG' }> };

type ThingType = AppEventMap[AppEventKey];

async function get_embed(audit: ThingType) {
  const user_r = await ResultAsync.fromPromise(client.users.fetch(audit.executor_id), map_err);
  const user = user_r.isOk() ? user_r.value : null;

  const e = new EmbedBuilder();
  e.setColor(config.style.info.colour as ColorResolvable);
  e.setTimestamp(new Date());
  e.setAuthor({ name: user?.username ?? audit.executor_id, iconURL: user?.displayAvatarURL() });
  return e;
}

function embed_config_update(audit: ConfigLog, embed: EmbedBuilder, t: i18n_func) {
  const adapter = setting_service.get_adapter(audit.data.setting_key);
  if (!adapter) return new EmbedBuilder();

  function display_safe(v: unknown) {
    if (!adapter!.is_type(v)) return String(v);
    return adapter!.display_value(v);
  }

  embed
    .setTitle(t('audit.config_embed_title'))
    .setDescription(t('audit.config_desc', { setting_key: audit.data.setting_key }))
    .setFields([
      {
        name: t('audit.config_embed_from'),
        value: display_safe(audit.data.old_value) ?? 'N/A',
        inline: true,
      },
      {
        name: t('audit.config_embed_to'),
        value: display_safe(audit.data.new_value) ?? 'N/A',
        inline: true,
      },
    ]);
  return embed;
}

type BatchLog = AuditData & { data: Extract<AuditData['data'], { audit_type: 'BATCH_ACTION' }> };
function embed_batch_action(audit: BatchLog, embed: EmbedBuilder, t: i18n_func) {
  embed.setTitle(
    t('audit.batch_title', {
      action_amount: audit.data.target_channels.length,
      action: audit.data.action,
    }),
  );
  return embed;
}

type MonitorLog = AuditData & {
  data: Extract<AuditData['data'], { audit_type: 'MONITOR_ADD' | 'MONITOR_REMOVE' }>;
};
function embed_channel_monitor(audit: MonitorLog, embed: EmbedBuilder, t: i18n_func) {
  const action_name =
    audit.data.audit_type === 'MONITOR_ADD' ? t('audit.monitor_start') : t('audit.monitor_end');

  embed.setTitle(t('audit.monitor_title')).setDescription(
    t('audit.monitor_desc', {
      action: action_name,
      channel_link: `<#${audit.data.target_channel}>`,
    }),
  );

  return embed;
}

type ThreadLog = AuditData & {
  data: Extract<AuditData['data'], { audit_type: 'THREAD_WATCHED' | 'THREAD_UNWATCHED' }>;
};
function embed_thread(audit: ThreadLog, embed: EmbedBuilder, t: i18n_func) {
  const action_name =
    audit.data.audit_type === 'THREAD_WATCHED'
      ? t('commands.watch.watch')
      : t('commands.watch.unwatch');
  embed.setTitle(t('audit.thread_watch_title')).setDescription(
    t('audit.thread_watch_desc', {
      action: action_name,
      channel_link: `<#${audit.data.thread_id}>`,
    }),
  );
  if (audit.reason) embed.setFooter({ text: audit.reason });
  return embed;
}

const AUDIT_EMBED_BUILDERS: Record<string, embed_gen> = {
  THREAD_WATCHED: embed_thread,
  THREAD_UNWATCHED: embed_thread,
  MONITOR_REMOVE: embed_channel_monitor,
  MONITOR_ADD: embed_channel_monitor,
  CONFIG: embed_config_update,
  BATCH_ACTION: embed_batch_action,
};

export function get_audit_embed(audit: ThingType, embed: EmbedBuilder, locale?: string) {
  const t = (key: string, obj?: { [key: string]: unknown }) =>
    i18next.t(key, { lng: locale, ...obj });
  const embed_func = AUDIT_EMBED_BUILDERS[audit.data.audit_type];

  if (!embed_func)
    return err(new Error(`No embed builder for audit type '${audit.data.audit_type}'`));

  return ok(embed_func(audit, embed, t));
}

export async function send_audit<TKey extends AppEventKey>(key: TKey, event: AppEventMap[TKey]) {
  const guild = client.guilds.cache.get(event.guild_id);

  const final_embed = await get_embed(event).then((base_embed) =>
    get_audit_embed(event, base_embed, guild?.preferredLocale),
  );

  if (final_embed.isErr()) {
    logger.error('could not get final_embed', final_embed.error);
    return err(final_embed.error);
  }

  const setting_value = await setting_service.get_setting(event.guild_id, 'LOGGING_CHANNEL');
  if (setting_value.isErr()) {
    logger.error(`Could not get logging channel from db`, setting_value.error);
    return err(setting_value.error);
  }
  if (typeof setting_value.value !== 'string') {
    return ok();
  }

  const channel = await ResultAsync.fromPromise(
    client.channels.fetch(setting_value.value),
    map_err,
  );
  if (channel.isErr()) {
    logger.error(`Could not get channel from discord`, channel.error);
    return err(channel.error);
  }

  if (!channel.value?.isSendable()) {
    logger.error(`Could get channel but it was not sendable`);
    return err(new Error('channel not sendable'));
  }

  const send_res = await ResultAsync.fromPromise(
    channel.value.send({ embeds: [final_embed.value] }) as Promise<Message<any>>,
    map_err,
  );

  if (send_res.isErr()) {
    logger.error('could not send audit message', send_res.error);
    return err(send_res.error);
  }

  return ok();
}
