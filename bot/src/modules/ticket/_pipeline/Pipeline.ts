import { TicketPanel } from '@watcher/shared';
import { err, ResultAsync } from 'neverthrow';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ColorResolvable,
  EmbedBuilder,
  Interaction,
  ThreadChannel,
  User,
} from 'discord.js';
import { create_module } from './helpers/module_factory';
import { logger } from '@providers/logger';
import { DefaultModule, IPipeline, SupportedInteractionType } from './DefaultModule';
import { ILogObj, Logger } from 'tslog';
import { s3 } from '@providers/s3_client';
import z from 'zod';
import { map_err } from 'utilities/error';
import { config } from '@providers/config';
import { generate_embed } from './components/embed';
import { safe_reply } from './helpers/safe_reply';
import { ValidPropertyReturn, ValueContainer } from './ValueContainter';

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

  constructor(
    private data: TicketPanel,
    int: Interaction,
    author: User,
  ) {
    this.assigned_channel = data.initial_channel_id;
    this.assigned_roles = data.initial_assigned_roles;
    this.logger = new Logger({ hideLogPositionForProduction: true });

    this.logger.attachTransport((log_obj) => this.append_log(log_obj));

    this.exports = new ValueContainer({}, 'ENV_ROOT');

    const this_env = new ValueContainer(
      {
        user: ValueContainer.from_user(author),
        assigned_roles: () => this.assigned_roles,
        ID: this.ticket_id,
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
        this_env.set('selection', container_res.value);
      }
    }

    this.exports.set('env', this_env);
  }

  async resolve_error(int: SupportedInteractionType, mod: DefaultModule<any>, error: Error) {
    if (this.is_resolved) return;
    this.is_resolved = true;
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

    safe_reply(int, { embeds: [embed], components: [row], flags: 'Ephemeral' });
  }

  async resolve_ticket(int: SupportedInteractionType) {
    if (this.is_resolved) return;
    this.is_resolved = true;
    this.write_log();

    if (!int.guild) return int.editReply('no guild');

    const fetched_parent_channel = await ResultAsync.fromPromise(
      int.guild?.channels.fetch(this.assigned_channel),
      map_err,
    );

    if (fetched_parent_channel.isErr()) {
      return int.editReply(fetched_parent_channel.error.message);
    }

    if (!fetched_parent_channel.value)
      return int.editReply(`Bro <#${this.assigned_channel}> ain't a real channel`);
    if (!('threads' in fetched_parent_channel.value))
      return int.editReply('Cuh this cant hold threads');
    const parent = fetched_parent_channel.value;
    const start_embed = generate_embed(this.data.resolved_embed, this.exports);

    let prom: Promise<ThreadChannel>;
    if (!parent.isTextBased() || parent.type === ChannelType.GuildAnnouncement)
      return err(new Error('cba dealing with this rn'));

    prom = parent.threads.create({
      name: this.name,
      reason: `ticket: ${this.ticket_id}`,
      type: ChannelType.PrivateThread,
    });

    const tc_res = await ResultAsync.fromPromise(prom, map_err);
    if (tc_res.isErr()) return int.editReply('could not create thread cuh :/ ' + tc_res.error);

    const msg_unsafe = await tc_res.value.send({ embeds: [start_embed] });

    safe_reply(int, {
      content: `Yay!!!!!!!! thread created...... <#${tc_res.value.id}> ${msg_unsafe.url}`,
    });
  }

  get_property(id: string): ValidPropertyReturn {
    const id_arr = ValueContainer.string_into_args(id);
    return this.exports.get(id_arr);
  }

  get_all_properties(): Record<string, ValidPropertyReturn | Record<string, unknown> | unknown[]> {
    return this.exports.all();
  }

  static from(data: TicketPanel, int: Interaction): Pipeline {
    const pipeline = new Pipeline(data, int, int.user);

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
