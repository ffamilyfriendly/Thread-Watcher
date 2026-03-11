import { TicketPanel } from '@watcher/shared';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  ThreadChannel,
} from 'discord.js';
import { create_module } from './helpers/module_factory';
import { logger } from '@providers/logger';
import { DefaultModule, IPipeline, SupportedInteractionType } from './DefaultModule';
import { ILogObj, Logger } from 'tslog';
import { s3 } from '@providers/s3_client';
import z, { string } from 'zod';
import { map_err } from 'utilities/error';
import { config } from '@providers/config';
import { safe_reply_or_followup } from 'utilities/interaction_helpers';
import { ValueContainer } from './ValueContainter';
import { ticket_service } from '@providers/services/ticket_service';
import { ContractLeafValue } from '@watcher/shared/tickets/contracts';
import { create_ticket_opened } from './components/embed';
import { interpolate_string } from './helpers/var_string';

const log_obj_schema = z
  .object({
    _meta: z.object({
      name: z.string(),
      date: z.coerce.date(),
      logLevelId: z.number(),
    }),
  })
  .catchall(
    z.unknown().transform((val) => {
      if (typeof val === 'string') return val;
      if (val instanceof Error) {
        return '<ERROR>' + val.message + '</ERROR>';
      }

      if (val && typeof val === 'object' && 'message' in val) {
        return '<ERROR>' + String(val.message) + '</ERROR>';
      }

      return String(val);
    }),
  );

export class Pipeline implements IPipeline {
  modules: Map<string, DefaultModule<any>> = new Map();
  assigned_roles: string[];
  assigned_channel: string;
  exports: ValueContainer;
  readonly ticket_id = crypto.randomUUID();
  name = 'Ticket-{{env.user.id}}';
  logger: Logger<unknown>;
  private is_resolved = false;
  private logs: ILogObj[] = [];

  get ticket_name() {
    return interpolate_string(this.name, this.exports);
  }

  get resolved() {
    return this.is_resolved;
  }

  get modules_arr() {
    return this.modules.values();
  }

  private append_log(log_obj: ILogObj) {
    this.logs.push(log_obj);
  }

  private create_header(text: string): [string, string] {
    const v1 = `=== ${text} ===`;
    const v2 = '='.repeat(v1.length);

    return [v1, v2];
  }

  private write_log() {
    const [info_start, info_end] = this.create_header('INFORMATION ABOUT THIS FILE');
    let buf: string[] = [
      info_start,
      `This file describes the events that happened during the ticket '${this.ticket_id}'.\nUnsure what you're looking for? You're welcome to join our support discord and ask! I promise we dont bite (hard) :)\ndiscord: https://botsuite.co/join\ndocs: https://docs.threadwatcher.xyz`,
      info_end,
    ];

    const properties = JSON.stringify(this.get_all_properties());
    const [prop_start, prop_end] = this.create_header('PIPELINE STATE SNAPSHOT');
    buf.push(prop_start);
    buf.push(properties);
    buf.push(prop_end);

    const [pipe_start, pipe_end] = this.create_header('PIPELINE LOGS');

    buf.push(pipe_start);
    this.logs.forEach((obj) => {
      const log_line = log_obj_schema.safeParse(obj);
      if (!log_line.success) {
        this.logger.warn('could not parse logger message', log_line.error, obj);
      } else {
        const { _meta, ...lines } = log_line.data;

        const message = Object.keys(lines)
          .filter((key) => !isNaN(Number(key)))
          .sort()
          .map((key) => lines[key])
          .join(' ');

        const timestamp = _meta.date.toISOString().split('T')[1].split('.')[0];

        buf.push(`[${timestamp}] ${_meta.name}: ${message}`);
      }
    });
    buf.push(pipe_end);

    const log_name = `logs/${this.ticket_id}_pipeline.txt`;
    ResultAsync.fromPromise(s3.write(log_name, buf.join('\n'), { bucket: 'cdn' }), map_err).then(
      (r) => {
        if (r.isErr()) this.logger.error('Could not save log', r.error);
      },
    );
  }

  constructor(readonly data: TicketPanel) {
    this.assigned_channel = data.initial_channel_id;
    this.assigned_roles = data.initial_assigned_roles;
    this.logger = new Logger({ hideLogPositionForProduction: true, name: 'PIPELINE' });
    this.logger.attachTransport((log_obj) => this.append_log(log_obj));
    this.exports = new ValueContainer({}, 'ENV_ROOT');
  }

  async populate_value_container(int: Interaction) {
    if (!int.guild) return err(new Error('interaction does not have guild object!'));
    const roles_res = await ResultAsync.fromPromise(int.guild.roles.fetch(), map_err);
    if (roles_res.isErr()) return err(roles_res.error);

    const this_env = new ValueContainer(
      {
        user: ValueContainer.from_user(int.user),
        ID: this.ticket_id,
        name: () => this.ticket_name, // This cant be static as the getter interpolates the values
      },
      this.ticket_id,
    );

    const applicable_roles = roles_res.value
      .values()
      .filter((r) => this.data.initial_assigned_roles.includes(r.id));

    if (this.data.commencement_method.type === 'SELECTION' && int.isStringSelectMenu()) {
      if (int.values.length > 1) {
        this_env.set(
          'selection',
          ValueContainer.from_string_selections(int.values, this.data.commencement_method.options),
        );
      } else {
        this_env.set(
          'selection',
          ValueContainer.from_string_select(int.values[0], this.data.commencement_method.options),
        );
      }
    }

    this_env.set('assigned_roles', ValueContainer.from_roles(applicable_roles.toArray()));
    this.exports.set('env', this_env);
    return ok();
  }

  async before_exit(): Promise<void> {
    this.write_log();
    return;
  }

  async start_ticket_with_thread(
    int: SupportedInteractionType,
    ticket_thread: ThreadChannel,
    start_message_id: string,
  ): Promise<Result<unknown, Error>> {
    if (this.is_resolved) return err(new Error('pipeline is already resolved!'));
    this.is_resolved = true;
    const ticket_name = this.ticket_name;
    const insert_ticket_res = await ticket_service.insert_ticket({
      ticket_id: this.ticket_id,
      name: ticket_name,
      panel_id: this.data.panel_id,
      guild_id: this.data.guild_id,
      owner: int.user.id,
      assigned_to_roles: this.assigned_roles,
      variable_dump: this.get_all_properties(),
      discord_channel_id: ticket_thread.id,
      start_message_id,
    });

    if (insert_ticket_res.isErr()) {
      this.logger.error(`Could not commit ticket to database!`);
      return err(insert_ticket_res.error as Error);
    }

    const [embed, row] = create_ticket_opened(ticket_name, this.ticket_id, ticket_thread.url);

    return safe_reply_or_followup(int, {
      embeds: [embed],
      components: [row],
      flags: 'Ephemeral',
    });
  }

  get_property(id: string): ContractLeafValue {
    const id_arr = ValueContainer.string_into_args(id);
    return this.exports.get(id_arr);
  }

  get_all_properties(): Record<string, ContractLeafValue | Record<string, unknown> | unknown[]> {
    return this.exports.all();
  }

  static from(data: TicketPanel): Pipeline {
    const pipeline = new Pipeline(data);

    for (const module_data of data.pipeline) {
      const module_instance = create_module(module_data, pipeline);
      if (module_instance.isErr()) {
        logger.warn(module_instance.error);
        continue;
      }

      // We set 'is_activated' to false to not pollute any env dump with null values.
      // This gets set to true automatically shortly before the module is ran
      module_instance.value.exports.is_activated = false;

      pipeline.exports.set(module_instance.value.id, module_instance.value.exports);
      pipeline.modules.set(module_instance.value.id, module_instance.value);
    }

    return pipeline;
  }
}
