import { BaseModule, PipelineModule, TicketPanel } from '@watcher/shared';
import AssignRole from './modules/AssignRole';
import { ok, Result, ResultAsync } from 'neverthrow';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  StringSelectMenuInteraction,
  User,
} from 'discord.js';
import { create_module } from './module_factory';
import { logger } from '@providers/logger';
import {
  DefaultModule,
  IPipeline,
  SupportedInteractionType,
  SupportedInteractionTypeWithGuild,
  ValidPropertyReturn,
  ValueContainer,
} from './base';
import { ILogObj, ILogObjMeta, Logger } from 'tslog';
import { writeFileSync } from 'fs';
import { s3 } from '@providers/s3_client';
import { parsedType } from 'zod/v4/core/util.cjs';
import z from 'zod';
import { map_err } from 'utilities/error';
import { config } from '@providers/config';

const log_obj_schema = z
  .object({
    _meta: z.object({
      name: z.string(),
      date: z.coerce.date(),
      logLevelId: z.number(),
    }),
  })
  .catchall(z.string());

export class Pipeline implements IPipeline {
  modules: Map<string, DefaultModule<any>> = new Map();
  assigned_roles: string[];
  assigned_channel: string;
  exports: ValueContainer;
  readonly ticket_id = crypto.randomUUID();
  name = 'Ticket';
  logger: Logger<unknown>;
  private is_resolved = false;
  private logs: ILogObj[] = [];

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
        this.logger.warn('could not parse logger message', log_line.error);
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

  constructor(data: TicketPanel, int: Interaction, author: User) {
    this.assigned_channel = data.initial_channel_id;
    this.assigned_roles = data.initial_assigned_roles;
    this.logger = new Logger({ hideLogPositionForProduction: true, type: 'hidden' });

    this.logger.attachTransport((log_obj) => this.append_log(log_obj));

    this.exports = new ValueContainer(
      {
        user: ValueContainer.from_user(author),
        assigned_roles: () => this.assigned_roles,
        id: this.ticket_id,
        number: () => 2,
        name: this.name,
      },
      this.ticket_id,
    );

    if (data.commencement_method.type === 'SELECTION' && int.isStringSelectMenu()) {
      const container_res = ValueContainer.from_string_select_interaction(
        int,
        data.commencement_method,
      );
      if (container_res.isErr()) {
        this.logger.error(
          `Could not initialize string_select_interaction ValueContainer`,
          container_res.error,
        );
      } else {
        this.exports.set('selection', container_res.value);
      }
    }
  }

  async resolve_error(int: SupportedInteractionType, mod: DefaultModule<any>, error: Error) {
    if (this.is_resolved) return;
    this.write_log();

    const embed = new EmbedBuilder();
    embed.setColor(config.style.error.colour as ColorResolvable);
    embed.setTitle(`${config.style.error.emoji} Panel Failed`);
    embed.setDescription(
      `Panel ran into a non-continuable state on module \`${mod.id}\`.\nWe're sorry about this, please try again later.`,
    );

    const row = new ActionRowBuilder<ButtonBuilder>();
    const btn_logs = new ButtonBuilder();
    btn_logs.setStyle(ButtonStyle.Link);
    btn_logs.setURL(`https://cdn.threadwatcher.xyz/logs/${this.ticket_id}_pipeline.txt`);
    btn_logs.setLabel('View Logs');
    row.addComponents(btn_logs);

    int.reply({ embeds: [embed], components: [row], flags: 'Ephemeral' });
  }

  async resolve_ticket(int: SupportedInteractionType) {
    if (this.is_resolved) return;
    this.write_log();
  }

  get_property(id: string): ValidPropertyReturn {
    const id_arr = id.split('.');
    const module_id = id_arr.shift();
    if (!module_id) return null;
    if (module_id === 'env') return this.exports.get(id_arr);
    const module = this.modules.get(module_id);
    return module?.exports.get(id_arr) ?? null;
  }

  get_all_properties(): Record<string, ValidPropertyReturn | Record<string, unknown>> {
    const rv: Record<string, ValidPropertyReturn | Record<string, unknown>> = {};

    rv['env'] = this.exports.all();

    for (const mod of this.modules_arr) {
      rv[mod.id] = mod.exports.all();
    }

    return rv;
  }

  static from(data: TicketPanel, int: Interaction): Pipeline {
    const pipeline = new Pipeline(data, int, int.user);

    for (const module_data of data.pipeline) {
      const module_instance = create_module(module_data, pipeline);
      if (module_instance.isErr()) {
        logger.warn(module_instance.error);
        continue;
      }
      pipeline.modules.set(module_instance.value.id, module_instance.value);
    }

    return pipeline;
  }
}
