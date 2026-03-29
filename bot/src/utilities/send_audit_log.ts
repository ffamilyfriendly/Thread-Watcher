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
import { is_setting_key } from 'interfaces/Settings';

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
  if (!is_setting_key(audit.data.setting_key)) return embed;
  const adapter = setting_service.get_adapter(audit.data.setting_key);
  if (!adapter) return embed;

  function display_safe(v: unknown) {
    if (!adapter.adapter!.is_type(v)) return String(v);
    return adapter.adapter!.display_value(v);
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

const auditBuffer = new Map<
  string,
  {
    embeds: EmbedBuilder[];
    timeout: Timer | null;
  }
>();

const MAX_EMBEDS_PER_MSG = 10;
const DEBOUNCE_MS = 1500;

export async function send_audit<TKey extends AppEventKey>(key: TKey, event: AppEventMap[TKey]) {
  const guildId = event.guild_id;
  const guild = client.guilds.cache.get(guildId);

  const embedResult = await get_embed(event).then((base_embed) =>
    get_audit_embed(event, base_embed, guild?.preferredLocale),
  );

  if (embedResult.isErr()) {
    logger.error('could not generate audit_embed', embedResult.error);
    return err(embedResult.error);
  }

  if (!auditBuffer.has(guildId)) {
    auditBuffer.set(guildId, { embeds: [], timeout: null });
  }

  const session = auditBuffer.get(guildId)!;
  session.embeds.push(embedResult.value);

  if (session.timeout) clearTimeout(session.timeout);

  session.timeout = setTimeout(() => flush_audit_buffer(guildId), DEBOUNCE_MS);

  return ok();
}

async function flush_audit_buffer(guildId: string) {
  const session = auditBuffer.get(guildId);
  if (!session || session.embeds.length === 0) return;

  auditBuffer.delete(guildId);

  const { embeds } = session;

  const setting_value = await setting_service.get_setting(guildId, 'LOGGING_CHANNEL');
  if (setting_value.isErr() || typeof setting_value.value !== 'string') return;

  const channelRes = await ResultAsync.fromPromise(
    client.channels.fetch(setting_value.value),
    map_err,
  );
  if (channelRes.isErr() || !channelRes.value?.isSendable()) return;

  const channel = channelRes.value;

  const chunks: EmbedBuilder[][] = [];
  for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MSG) {
    chunks.push(embeds.slice(i, i + MAX_EMBEDS_PER_MSG));
  }

  for (const [index, chunk] of chunks.entries()) {
    let content = undefined;

    if (chunks.length > 1 && index === 0) {
      content = `⚠️ **Too many audits:** Collected ${embeds.length} events. Sending in multiple messages...`;
    }

    const send_res = await ResultAsync.fromPromise(
      channel.send({ content, embeds: chunk }) as Promise<Message<any>>,
      map_err,
    );

    if (send_res.isErr()) {
      logger.error(`Failed to flush audit chunk for ${guildId}`, send_res.error);
    }
  }
}
