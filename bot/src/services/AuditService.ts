import { setting_service } from '@providers/services/setting_service';
import { AuditData, FilterData } from '@watcher/shared';
import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  CommandInteractionOption,
  EmbedBuilder,
  User,
} from 'discord.js';
import i18next from 'i18next';
import { Database, DatabaseError } from 'interfaces/Database';
import { err, ok, Result } from 'neverthrow';
import { map_err } from 'utilities/error';

// Matches your ZAuditTypes literal values
export const AUDIT_TYPES_LIST = [
  'COMMAND',
  'CONFIG',
  'BATCH_ACTION',
  'THREAD_WATCHED',
  'THREAD_UNWATCHED',
  'MONITOR_ADD',
  'MONITOR_REMOVE',
] as const;

export type AuditType = (typeof AUDIT_TYPES_LIST)[number];

// Using AuditData directly as our base
export type PartialAuditObject = Omit<AuditData, 'id' | 'timestamp'>;

export default class AuditService {
  constructor(private db: Database) {}

  async log_event(meta: PartialAuditObject): Promise<Result<PartialAuditObject, DatabaseError>> {
    const insert_res = await this.db.insert_audit_log(meta);
    if (insert_res.isErr()) return err(insert_res.error);
    return ok(meta);
  }

  async log_thread_watch(
    thread_id: string,
    guild_id: string,
    executor_id: string,
    reason: string,
    monitor?: string,
  ) {
    return this.log_event({
      guild_id,
      executor_id,
      reason,
      data: {
        audit_type: 'THREAD_WATCHED',
        thread_id,
        due_to_monitor: monitor ?? null,
      },
    });
  }

  async log_thread_unwatch(
    thread_id: string,
    guild_id: string,
    executor_id: string,
    reason: string,
    monitor?: string,
  ) {
    return this.log_event({
      guild_id,
      executor_id,
      reason,
      data: {
        audit_type: 'THREAD_UNWATCHED',
        thread_id,
        due_to_monitor: monitor ?? null,
      },
    });
  }

  async log_monitor_added(
    target_id: string,
    guild_id: string,
    executor_id: string,
    filters: FilterData,
    reason?: string,
  ) {
    return this.log_event({
      guild_id,
      executor_id,
      reason,
      data: {
        audit_type: 'MONITOR_ADD',
        target_channel: target_id,
        filters,
      },
    });
  }

  async log_monitor_removed(
    target_id: string,
    executor_id: string,
    guild_id: string,
    reason?: string,
  ) {
    return this.log_event({
      guild_id,
      executor_id,
      reason,
      data: {
        audit_type: 'MONITOR_REMOVE',
        target_channel: target_id,
      },
    });
  }

  async log_config_update(
    executor_id: string,
    guild_id: string,
    setting_key: string,
    old_value: string | number | boolean | string[] | null,
    new_value: string | number | boolean | string[] | null,
    reason?: string,
  ) {
    return this.log_event({
      guild_id,
      executor_id,
      reason,
      data: {
        audit_type: 'CONFIG',
        old_value,
        new_value,
        setting_key,
      },
    });
  }

  async log_command(
    executor_id: string,
    guild_id: string,
    command_name: string,
    command_args: Record<string, unknown>,
    error?: string,
  ) {
    return this.log_event({
      executor_id,
      guild_id,
      data: {
        audit_type: 'COMMAND',
        command_name,
        command_args,
        error,
      },
    });
  }

  async log_batch_action(
    guild_id: string,
    executor_id: string,
    target_channels: string[],
    action: 'WATCH' | 'UNWATCH' | 'TOGGLE',
  ) {
    return this.log_event({
      executor_id,
      guild_id,
      data: {
        audit_type: 'BATCH_ACTION',
        action,
        target_channels,
      },
    });
  }

  get_builder_from_command_interaction(interaction: CommandInteraction & { guildId: string }) {
    return new AuditCommandBuilder(this, interaction.guildId, interaction.user.id).set_command_name(
      interaction.commandName,
    );
  }

  async get_audit_logs(guild_id: string, page_size: number, before_id?: number) {
    return await this.db.get_audit_logs(guild_id, page_size, before_id);
  }
}

export class AuditCommandBuilder {
  private data: Record<string, any> = {};
  private reason?: string;
  private time_started?: Date;
  private command_name: string = '';
  private error?: string;
  private command_args: Record<string, unknown> = {};

  constructor(
    private AS_instance: AuditService,
    private guild_id: string,
    private executor_id: string,
  ) {}

  set_reason(reason: string) {
    this.reason = reason;
    return this;
  }
  set_command_name(name: string) {
    this.command_name = name;
    return this;
  }

  set_err(err: unknown) {
    const as_err = map_err(err);
    this.error = as_err.message;
    return this;
  }

  with_error(error: Error | string) {
    this.data.error = typeof error === 'string' ? error : error.message;
    return this;
  }

  set_cmd_args(int: ChatInputCommandInteraction) {
    const extract_options = (options: readonly CommandInteractionOption<CacheType>[]) => {
      for (const arg of options) {
        if (arg.value !== undefined) {
          this.command_args[arg.name] = arg.value;
        } else if (arg.options) {
          extract_options(arg.options);
        }
      }
    };

    extract_options(int.options.data);
    return this;
  }

  bind_err_func(callback: (err_argument: Error, ...args: any[]) => void) {
    return (err_arg: Error, ...args: any[]) => {
      this.with_error(err_arg);
      this.commit();
      callback(err_arg, ...args);
    };
  }

  commit() {
    if (this.time_started) {
      this.data.exec_time_ms = Date.now() - this.time_started.getTime();
    }

    return this.AS_instance.log_command(
      this.executor_id,
      this.guild_id,
      this.command_name,
      this.command_args,
      this.error,
    );
  }
}

type i18n_func = (key: string, obj?: { [key: string]: unknown }) => string;
type embed_gen = (audit: any, t: i18n_func) => EmbedBuilder;

type ConfigLog = AuditData & { data: Extract<AuditData['data'], { audit_type: 'CONFIG' }> };
function embed_config_update(audit: ConfigLog, t: i18n_func) {
  const adapter = setting_service.get_adapter(audit.data.setting_key);
  if (!adapter) return new EmbedBuilder();

  function display_safe(v: unknown) {
    if (!adapter!.is_type(v)) return String(v);
    return adapter!.display_value(v);
  }

  const embed = new EmbedBuilder()
    .setTitle(t('audit.config_embed_title'))
    .setDescription(t('audit.config_desc', { setting_key: audit.reason }))
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
function embed_batch_action(audit: BatchLog, t: i18n_func) {
  return new EmbedBuilder().setTitle(
    t('audit.batch_title', {
      action_amount: audit.data.target_channels.length,
      action: audit.data.action,
    }),
  );
}

type MonitorLog = AuditData & {
  data: Extract<AuditData['data'], { audit_type: 'MONITOR_ADD' | 'MONITOR_REMOVE' }>;
};
function embed_channel_monitor(audit: MonitorLog, t: i18n_func) {
  const action_name =
    audit.data.audit_type === 'MONITOR_ADD' ? t('audit.monitor_start') : t('audit.monitor_end');
  return new EmbedBuilder().setTitle(t('audit.monitor_title')).setDescription(
    t('audit.monitor_desc', {
      action: action_name,
      channel_link: `<#${audit.data.target_channel}>`,
    }),
  );
}

type ThreadLog = AuditData & {
  data: Extract<AuditData['data'], { audit_type: 'THREAD_WATCHED' | 'THREAD_UNWATCHED' }>;
};
function embed_thread(audit: ThreadLog, t: i18n_func) {
  const action_name =
    audit.data.audit_type === 'THREAD_WATCHED'
      ? t('commands.watch.watch')
      : t('commands.watch.unwatch');
  const embed = new EmbedBuilder().setTitle(t('audit.thread_watch_title')).setDescription(
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

export function get_audit_embed(audit: PartialAuditObject, locale: string, user: User) {
  const t = (key: string, obj?: { [key: string]: unknown }) =>
    i18next.t(key, { lng: locale, ...obj });
  const embed_func = AUDIT_EMBED_BUILDERS[audit.data.audit_type];

  if (!embed_func)
    return err(new Error(`No embed builder for audit type '${audit.data.audit_type}'`));

  const embed = embed_func(audit, t);
  embed.setAuthor({ name: user.username, iconURL: user.avatarURL() ?? user.defaultAvatarURL });
  embed.setTimestamp();

  return ok(embed);
}
