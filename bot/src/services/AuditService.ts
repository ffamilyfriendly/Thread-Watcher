import { CommandInteraction, EmbedBuilder, User } from 'discord.js';
import i18next from 'i18next';
import { AuditData, Database, DatabaseError } from 'interfaces/Database';
import { err, ok, Result } from 'neverthrow';

export type AuditType =
  | 'THREAD_WATCHED'
  | 'THREAD_UNWATCHED'
  | 'CHANNEL_MONITOR_START'
  | 'CHANNEL_MONITOR_END'
  | 'CONFIG_UPDATE'
  | 'COMMAND_EXEC'
  | 'BATCH_ACTION'; // Reason specifies what action was taken

export type PartialAuditObject = Omit<AuditData, 'id' | 'timestamp'>;
export default class AuditService {
  constructor(private db: Database) {}

  async log_event(
    type: AuditType,
    guild_id: string,
    executor_id: string,
    meta: Omit<AuditData, 'timestamp' | 'id' | 'guild_id' | 'executor_id' | 'audit_type'>,
  ): Promise<Result<PartialAuditObject, DatabaseError>> {
    const { reason, error, command_name, old_value, new_value, target_id, exec_time_ms } = meta;

    const log_obj = {
      audit_type: type,
      guild_id,
      executor_id,
      reason,
      error,
      command_name,
      old_value,
      new_value,
      target_id,
      exec_time_ms,
    };

    const insert_res = await this.db.insert_audit_log(log_obj);

    if (insert_res.isErr()) {
      return err(insert_res.error);
    }

    return ok(log_obj);
  }

  get_builder(guild_id: string, executor_id: string, audit_type: AuditType) {
    return new AuditEventBuilder(this, guild_id, executor_id, audit_type);
  }

  get_builder_from_command_interaction(interaction: CommandInteraction & { guildId: string }) {
    const builder = new AuditEventBuilder(
      this,
      interaction.guildId,
      interaction.user.id,
      'COMMAND_EXEC',
    );
    builder.set_command_name(interaction.commandName);
    return builder;
  }

  async get_audit_logs(guild_id: string, page_size: number, before_id?: number) {
    return await this.db.get_audit_logs(guild_id, page_size, before_id);
  }
}

export class AuditEventBuilder {
  time_started?: Date;
  target_id?: string;
  reason?: string;
  error?: string;
  command_name?: string;
  old_value?: string;
  new_value?: string;

  constructor(
    private AS_instance: AuditService,
    private guild_id: string,
    private executor_id: string,
    private audit_type: AuditType,
  ) {}

  with_timestamp(start_from?: Date) {
    this.time_started = start_from ?? new Date();
    return this;
  }

  set_reason(reason: string) {
    this.reason = reason;
    return this;
  }

  set_targetid(target_id: string) {
    this.target_id = target_id;
    return this;
  }

  set_target_ids(targets: { id: string }[]) {
    this.target_id = targets.map((t) => t.id).join(',');
    return this;
  }

  set_error(error: string) {
    this.error = error;
    return this;
  }

  set_command_name(cmd_name: string) {
    this.command_name = cmd_name;
    return this;
  }

  set_old_value(value: string) {
    this.old_value = value;
    return this;
  }

  set_new_value(value: string) {
    this.new_value = value;
    return this;
  }

  set_values(old_value: string, new_value: string) {
    this.old_value = old_value;
    this.new_value = new_value;
    return this;
  }

  with_error(error: Error) {
    this.error = error.message;
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
    const { reason, target_id, error, command_name, old_value, new_value } = this;
    let exec_time_ms = this.time_started ? Date.now() - this.time_started.getTime() : undefined;

    return this.AS_instance.log_event(this.audit_type, this.guild_id, this.executor_id, {
      exec_time_ms,
      reason,
      target_id,
      error,
      command_name,
      old_value,
      new_value,
    });
  }
}

type i18n_func = (key: string, obj?: { [key: string]: unknown }) => string;
type embed_gen = (audit: PartialAuditObject, t: i18n_func) => EmbedBuilder;

function embed_config_update(audit: PartialAuditObject, t: i18n_func) {
  const embed = new EmbedBuilder();
  embed.setTitle(t('audit.config_embed_title'));
  embed.setDescription(t('audit.config_desc', { setting_key: audit.reason }));
  embed.setFields([
    {
      name: t('audit.config_embed_from'),
      value: audit.old_value ?? '',
      inline: true,
    },
    {
      name: t('audit.config_embed_to'),
      value: audit.new_value ?? '',
      inline: true,
    },
  ]);

  return embed;
}

function embed_batch_action(audit: PartialAuditObject, t: i18n_func) {
  const embed = new EmbedBuilder();
  embed.setTitle(
    t('audit.batch_title', {
      action_amount: audit.target_id?.split(',').length,
      action: audit.reason,
    }),
  );

  return embed;
}

function embed_channel_monitor(audit: PartialAuditObject, t: i18n_func) {
  const embed = new EmbedBuilder();
  const action_name =
    audit.audit_type == 'CHANNEL_MONITOR_START' ? t('audit.monitor_start') : t('audit.monitor_end');
  embed.setTitle(t('audit.monitor_title'));
  embed.setDescription(
    t('audit.monitor_desc', { action: action_name, channel_link: `<#${audit.target_id}>` }),
  );

  return embed;
}

function embed_thread(audit: PartialAuditObject, t: i18n_func) {
  const embed = new EmbedBuilder();
  const action_name =
    audit.audit_type == 'THREAD_WATCHED' ? t('commands.watch.watch') : t('commands.watch.unwatch');
  embed.setTitle(t('audit.thread_watch_title'));
  embed.setDescription(
    t('audit.thread_watch_desc', { action: action_name, channel_link: `<#${audit.target_id}>` }),
  );

  if (audit.reason) {
    embed.setFooter({ text: audit.reason });
  }

  return embed;
}

const AUDIT_EMBED_BUILDERS: Partial<Record<AuditType, embed_gen>> = {
  THREAD_WATCHED: embed_thread,
  THREAD_UNWATCHED: embed_thread,
  CHANNEL_MONITOR_END: embed_channel_monitor,
  CHANNEL_MONITOR_START: embed_channel_monitor,
  CONFIG_UPDATE: embed_config_update,
  BATCH_ACTION: embed_batch_action,
};

export function get_audit_embed(audit: PartialAuditObject | AuditData, locale: string, user: User) {
  const t = (key: string, obj?: { [key: string]: unknown }) =>
    i18next.t(key, { lng: locale, ...obj });
  const embed_func = AUDIT_EMBED_BUILDERS[audit.audit_type as AuditType];

  if (!embed_func) return err(new Error(`No embed builder for audit type '${audit.audit_type}'`));

  const embed = embed_func(audit, t);
  embed.setAuthor({
    name: user.username,
    iconURL: user.avatarURL() ?? user.defaultAvatarURL,
  });
  embed.setTimestamp();

  return ok(embed);
}
