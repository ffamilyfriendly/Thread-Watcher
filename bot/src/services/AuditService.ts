import { CommandInteraction } from 'discord.js';
import { AuditData, Database } from 'interfaces/Database';

export type AuditType =
  | 'THREAD_WATCHED'
  | 'THREAD_UNWATCHED'
  | 'CHANNEL_MONITOR_START'
  | 'CHANNEL_MONITOR_END'
  | 'CONFIG_UPDATE'
  | 'COMMAND_EXEC'
  | 'BATCH_ACTION'; // Reason specifies what action was taken
export default class AuditService {
  constructor(private db: Database) {}

  async log_event(
    type: AuditType,
    guild_id: string,
    executor_id: string,
    meta: Omit<AuditData, 'timestamp' | 'id' | 'guild_id' | 'executor_id' | 'audit_type'>,
  ) {
    const { reason, error, command_name, old_value, new_value, target_id, exec_time_ms } = meta;
    return this.db.insert_audit_log({
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
    });
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
      callback(err_arg, args);
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
