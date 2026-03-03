import { PipelineModule } from '@watcher/shared';
import { ButtonInteraction, Guild, StringSelectMenuInteraction, User } from 'discord.js';
import { Pipeline } from './state';
import { ok, Result } from 'neverthrow';
import { Logger } from 'tslog';

namespace Op {
  export function and(v: boolean[]): boolean {
    return v.every(Boolean);
  }

  export function or(v: boolean[]): boolean {
    return !!v.find((v) => v);
  }

  export function starts_with(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    if (!v2) return false;

    if (typeof v1 === 'string') {
      let v2_string = Array.isArray(v2) ? v2.join(',') : v2.toString();
      return v1.startsWith(v2_string);
    }

    return v1?.toString().startsWith(v2.toString()) ?? false;
  }

  export function ends_with(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    if (!v2) return false;

    if (typeof v1 === 'string') {
      let v2_string = Array.isArray(v2) ? v2.join(',') : v2.toString();
      return v1.endsWith(v2_string);
    }

    return v1?.toString().endsWith(v2.toString()) ?? false;
  }

  export function not_null(v1: ValidPropertyReturn): boolean {
    return !!v1;
  }

  export function includes(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    if (typeof v2 !== 'string') return false;
    if (!v1) return false;
    if (typeof v1 === 'number') return false;

    return v1.includes(v2);
  }

  export function eq(v1: ValidPropertyReturn, v2: ValidPropertyReturn): boolean {
    return v1 == v2;
  }
}

type ValueContainerValue = ValidPropertyReturn | (() => ValidPropertyReturn) | ValueContainer;
export class ValueContainer {
  constructor(
    public exports: Record<string, ValueContainerValue>,
    private default_value: ValidPropertyReturn,
  ) {}

  get(keys: string[]): ValidPropertyReturn {
    const key = keys.shift();
    if (!key) return null;

    const value = this.exports[key];

    if (value instanceof ValueContainer) {
      if (keys.length === 0) return this.default_value;
      return value.get(keys);
    }

    if (typeof value === 'function') return value();

    return value;
  }

  static from_user(user: User): ValueContainer {
    return new ValueContainer(
      {
        id: user.id,
        username: user.username,
        tag: user.tag,
      },
      user.id,
    );
  }
}

export type SupportedInteractionType = ButtonInteraction | StringSelectMenuInteraction;
export type SupportedInteractionTypeWithGuild = SupportedInteractionType & {
  guildId: string;
  guild: Guild;
};
export type ValidPropertyReturn = string | number | (string | number)[] | null;

export abstract class DefaultModule<TModType extends PipelineModule> {
  private l: Logger<unknown>;

  constructor(
    protected self: TModType,
    protected pipeline: IPipeline,
    readonly exports: ValueContainer,
  ) {
    this.l = pipeline.logger.getSubLogger({ name: `[${self.type}] ${self.id}` });
  }

  get id() {
    return this.self.id;
  }

  private get_conditional_value(v?: string | null) {
    if (!v) return null;
    if (!v.startsWith('{{') || !v.endsWith('}}')) return v;
    const variable_name = v.substring(2, v.length - 2);
    return this.pipeline.get_property(variable_name);
  }

  satisfies_conditionals(): boolean {
    let bools: boolean[] = [];

    for (const conditional of this.self.conditionals) {
      const val_1 = this.get_conditional_value(conditional.value_1);
      const val_2 = this.get_conditional_value(conditional.value_2);

      let bool_val;
      switch (conditional.operand) {
        case 'starts_with':
          bool_val = Op.starts_with(val_1, val_2);
          break;
        case 'ends_with':
          bool_val = Op.ends_with(val_1, val_2);
          break;
        case 'not_null':
          bool_val = Op.not_null(val_1);
          break;
        case 'includes':
          bool_val = Op.includes(val_1, val_2);
          break;
        case 'equal':
          bool_val = Op.eq(val_1, val_2);
      }
      this.l.silly(`${val_1} ${conditional.operand} ${val_2} = ${bool_val}`);
      bools.push(bool_val);
    }

    return this.self.conditional_type === 'AND' ? Op.and(bools) : Op.or(bools);
  }

  protected abstract run(
    interaction: SupportedInteractionTypeWithGuild,
  ): Promise<Result<SupportedInteractionTypeWithGuild | void, Error>>;

  run_module(interaction: SupportedInteractionTypeWithGuild) {
    const is_satisfied = this.satisfies_conditionals();

    this.l.silly(`Module ${this.id} satisfied: ${is_satisfied}`);

    if (!is_satisfied) {
      // might do some logging or whatever here
      return ok();
    }

    return this.run(interaction);
  }
}

export interface IPipeline {
  assigned_roles: string[];
  assigned_channel: string;
  logger: Logger<unknown>;

  get_property(id: string): ValidPropertyReturn;
}
