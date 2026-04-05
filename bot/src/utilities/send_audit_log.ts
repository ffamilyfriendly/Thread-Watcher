import { client } from '@providers/client';
import { config } from '@providers/config';
import { setting_service } from '@providers/services/setting_service';
import { AuditData, NarrowedLog } from '@watcher/shared';
import { ColorResolvable, EmbedBuilder, Message } from 'discord.js';
import { AppEventKey, AppEventMap } from 'events/bus';
import { ok, ResultAsync } from 'neverthrow';
import { map_err } from './error';
import { logger } from '@providers/logger';
import { is_setting_key } from 'interfaces/Settings';
import { from_locale_str, TypedI18Func } from './i18def';

abstract class AuditLoggable<Tkey extends AuditData['data']['audit_type']> {
  embed: EmbedBuilder = new EmbedBuilder();
  t: TypedI18Func;
  constructor(
    readonly event: Omit<NarrowedLog<Tkey>, 'id' | 'timestamp'>,
    locale?: string,
  ) {
    this.embed.setColor(config.style.info.colour as ColorResolvable);
    if (event.reason) this.embed.setFooter({ text: event.reason });
    this.t = from_locale_str(locale);
    this.configure_embed(this.embed);
  }

  async init_embed() {
    const user_res = await ResultAsync.fromPromise(
      client.users.fetch(this.event.executor_id),
      map_err,
    );
    if (user_res.isErr()) {
      logger.warn(`could not get user object for audit log '${this.event.data.audit_type}'`);
    }

    const user_is_bot_staff = config.owners.includes(this.event.executor_id);

    const baseName = user_res.isOk()
      ? (user_res.value.globalName ?? user_res.value.username)
      : this.event.executor_id;

    const username = baseName + (user_is_bot_staff ? ' ' + this.t('audit.is_bot_staff') : '');

    this.embed.setAuthor({
      name: username,
      iconURL: user_res.isOk() ? user_res.value.displayAvatarURL() : undefined,
    });
  }

  abstract configure_embed(e: EmbedBuilder): void;
}

class ConfigChange extends AuditLoggable<'CONFIG'> {
  configure_embed(e: EmbedBuilder): void {
    if (!is_setting_key(this.event.data.setting_key)) return;
    const adapter = setting_service.get_adapter(this.event.data.setting_key);
    if (!adapter) return;

    function display_safe(v: unknown) {
      if (!adapter.adapter!.is_type(v)) return String(v);
      return adapter.adapter!.display_value(v);
    }

    e.setTitle(this.t('audit.config_embed_title'))
      .setDescription(this.t('audit.config_desc', { setting_key: this.event.data.setting_key }))
      .setFields([
        {
          name: this.t('audit.config_embed_from'),
          value: display_safe(this.event.data.old_value),
          inline: true,
        },
        {
          name: this.t('audit.config_embed_to'),
          value: display_safe(this.event.data.new_value),
          inline: true,
        },
      ]);
  }
}

class BatchAction extends AuditLoggable<'BATCH_ACTION'> {
  configure_embed(e: EmbedBuilder): void {
    e.setTitle(
      this.t('audit.batch_title', {
        action_amount: this.event.data.target_channels.length,
        action: this.event.data.action.toLowerCase(),
      }),
    );
  }
}

class MonitorAddedOrRemoved extends AuditLoggable<'MONITOR_ADD' | 'MONITOR_REMOVE'> {
  configure_embed(e: EmbedBuilder): void {
    const action_name =
      this.event.data.audit_type === 'MONITOR_ADD'
        ? this.t('audit.monitor_start')
        : this.t('audit.monitor_end');

    e.setTitle(this.t('audit.monitor_title')).setDescription(
      this.t('audit.monitor_desc', {
        action: action_name,
        channel_link: `<#${this.event.data.target_channel}>`,
      }),
    );
  }
}

class ThreadWatchedOrUnwatched extends AuditLoggable<'THREAD_WATCHED' | 'THREAD_UNWATCHED'> {
  configure_embed(embed: EmbedBuilder): void {
    const action_name =
      this.event.data.audit_type === 'THREAD_WATCHED'
        ? this.t('commands.watch.watch')
        : this.t('commands.watch.unwatch');
    embed.setTitle(this.t('audit.thread_watch_title')).setDescription(
      this.t('audit.thread_watch_desc', {
        action: action_name,
        channel_link: `<#${this.event.data.thread_id}>`,
      }),
    );
  }
}

class PanelCreatedOrRemoved extends AuditLoggable<'PANEL_CREATED' | 'PANEL_REMOVED'> {
  configure_embed(e: EmbedBuilder): void {
    const title =
      this.event.data.audit_type === 'PANEL_CREATED'
        ? this.t('ticket.panel_created')
        : this.t('ticket.panel_removed');

    const body =
      this.event.data.audit_type === 'PANEL_CREATED'
        ? this.t('ticket.panel_created_text')
        : this.t('ticket.panel_removed_text');

    e.setTitle(title).setDescription(body);
  }
}

class TicketOpened extends AuditLoggable<'TICKET_OPENED'> {
  configure_embed(e: EmbedBuilder): void {
    e.setColor(config.style.success.colour as ColorResolvable);
    e.setTitle(this.t('ticket.ticket_opened_title'));
    e.setDescription(this.t('ticket.ticket_opened_body', { ticket_id: this.event.data.ticket_id }));
  }
}

class TicketClosed extends AuditLoggable<'TICKET_RESOLVED'> {
  configure_embed(e: EmbedBuilder): void {
    e.setTitle(this.t('ticket.ticket_closed_title'));
    e.setDescription(this.t('ticket.ticket_closed_body', { ticket_id: this.event.data.ticket_id }));
  }
}

type AuditLoggableClass<T extends AuditKey> = new (
  event: Omit<NarrowedLog<T>, 'id' | 'timestamp'>,
  locale?: string,
) => AuditLoggable<T>;
type AuditKey = AuditData['data']['audit_type'];
const AUDIT_EMBED_BUILDERS: {
  [K in Exclude<AuditKey, 'COMMAND'>]: AuditLoggableClass<K>;
} = {
  THREAD_WATCHED: ThreadWatchedOrUnwatched as any,
  THREAD_UNWATCHED: ThreadWatchedOrUnwatched as any,
  MONITOR_REMOVE: MonitorAddedOrRemoved as any,
  MONITOR_ADD: MonitorAddedOrRemoved as any,
  CONFIG: ConfigChange,
  BATCH_ACTION: BatchAction,
  PANEL_CREATED: PanelCreatedOrRemoved as any,
  PANEL_REMOVED: PanelCreatedOrRemoved as any,
  TICKET_OPENED: TicketOpened,
  TICKET_RESOLVED: TicketClosed,
};

const audit_buffer = new Map<
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

  if (event.data.audit_type === 'COMMAND') return ok();

  const Builder = AUDIT_EMBED_BUILDERS[event.data.audit_type as Exclude<AuditKey, 'COMMAND'>];
  const audit_instance = new Builder(
    event as any /* TODO: stop using any here */,
    guild?.preferredLocale,
  );

  await audit_instance.init_embed();

  if (!audit_buffer.has(guildId)) {
    audit_buffer.set(guildId, { embeds: [], timeout: null });
  }

  const session = audit_buffer.get(guildId)!;
  session.embeds.push(audit_instance.embed);

  if (session.timeout) clearTimeout(session.timeout);

  session.timeout = setTimeout(() => flush_audit_buffer(guildId), DEBOUNCE_MS);

  return ok();
}

async function flush_audit_buffer(guildId: string) {
  const session = audit_buffer.get(guildId);
  if (!session || session.embeds.length === 0) return;

  audit_buffer.delete(guildId);

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
