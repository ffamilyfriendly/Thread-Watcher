import { BaseModule, PipelineModule, TicketPanel } from '@watcher/shared';
import AssignRole from './modules/AssignRole';
import { ok, Result } from 'neverthrow';
import { ButtonInteraction, StringSelectMenuInteraction, User } from 'discord.js';
import { create_module } from './module_factory';
import { logger } from '@providers/logger';
import { DefaultModule, IPipeline, ValidPropertyReturn, ValueContainer } from './base';
import { Logger } from 'tslog';

export class Pipeline implements IPipeline {
  modules: Map<string, DefaultModule<any>> = new Map();
  assigned_roles: string[];
  assigned_channel: string;
  exports: ValueContainer;
  readonly ticket_id = crypto.randomUUID();
  name = 'Ticket';
  logger: Logger<unknown>;

  get modules_arr() {
    return this.modules.values();
  }

  constructor(assigned_channel: string, initial_roles: string[], author: User) {
    this.assigned_channel = assigned_channel;
    this.assigned_roles = initial_roles;
    this.logger = new Logger();

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
  }

  get_property(id: string): ValidPropertyReturn {
    const id_arr = id.split('.');
    const module_id = id_arr.shift();
    if (!module_id) return null;
    if (module_id === 'env') return this.exports.get(id_arr);
    const module = this.modules.get(module_id);
    return module?.exports.get(id_arr) ?? null;
  }

  static from(data: TicketPanel, author: User): Pipeline {
    const pipeline = new Pipeline(data.initial_channel_id, data.initial_assigned_roles, author);

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
