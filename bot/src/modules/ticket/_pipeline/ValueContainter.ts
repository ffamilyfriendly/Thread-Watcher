import { SelectionStart } from '@watcher/shared';
import { Channel, DMChannel, StringSelectMenuInteraction, User } from 'discord.js';
import { err, ok, Result } from 'neverthrow';

export type ValueContainerValue =
  | ValidPropertyReturn
  | (() => ValidPropertyReturn)
  | ValueContainer
  | ValueContainer[];
export type MappedProps = Record<string, ValidPropertyReturn | Record<string, unknown> | unknown[]>;
export type ValidPropertyReturn = string | number | (string | number)[] | null;

export class ValueContainer {
  is_activated = true;
  constructor(
    public exports: Record<string, ValueContainerValue>,
    private default_value: ValidPropertyReturn,
  ) {}

  static is_array(value: unknown): value is ValueContainer[] {
    return Array.isArray(value) && value.every((obj) => obj instanceof ValueContainer);
  }

  activate() {
    this.is_activated = true;
  }

  set(key: string, value: ValueContainerValue) {
    this.exports[key] = value;
  }

  get(keys: string[]): ValidPropertyReturn {
    if (!this.is_activated) return null;
    const key = keys.shift()?.match(/(?<key_name>[\w-_]+)(\[(?<index>\d+)\]|)/);
    if (!key) return null;

    const key_name = key.groups?.['key_name'];
    const index = key.groups?.['index'];

    if (!key_name) return null;

    const value = this.exports[key_name];

    if (value instanceof ValueContainer) {
      if (keys.length === 0) return this.default_value;
      return value.get(keys);
    }
    if (typeof value === 'function') return value();

    if (ValueContainer.is_array(value)) {
      let index_nr = index ? Number(index) : 0;
      if (index_nr < 0) index_nr = value.length + index_nr;
      const target = value[index_nr];

      if (!target) return null;

      return target.get(keys);
    }

    return value;
  }

  all(): MappedProps {
    if (!this.is_activated) return {};
    const rv: MappedProps = {};

    for (const [name, value] of Object.entries(this.exports)) {
      if (value instanceof ValueContainer) {
        if (value.is_activated) rv[name] = value.all();
      } else if (typeof value === 'function') {
        rv[name] = value();
      } else if (ValueContainer.is_array(value)) {
        rv[name] = value.map((vc) => vc.all());
      } else {
        rv[name] = value;
      }
    }

    return rv;
  }

  static value_into_string(value: ValidPropertyReturn, variable_name?: 'Unknown'): string {
    if (!value) return `\`? ${variable_name} ?\``;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') return value.toString();
    return value;
  }

  static string_into_args(str: string) {
    return str.split('.');
  }

  static from_user(user: User): ValueContainer {
    return new ValueContainer(
      {
        id: user.id,
        username: user.username,
        tag: `<@${user.id}>`,
      },
      user.id,
    );
  }

  static from_users(users: User[]): ValueContainer[] {
    return users.map((user) => this.from_user(user));
  }

  static from_channel(channel: Channel): ValueContainer {
    let name = 'name' in channel ? channel.name : null;

    return new ValueContainer(
      {
        id: channel.id,
        name: name,
      },
      channel.id,
    );
  }

  static from_string_select_interaction(
    int: StringSelectMenuInteraction,
    data: SelectionStart,
  ): Result<ValueContainer, Error> {
    const value = int.values[0];
    const option = data.options.find((opt) => opt.option_id === value);
    if (!value || !option) return err(new Error("missing 'value' or 'option'"));

    return ok(
      new ValueContainer(
        {
          id: value,
          label: option.title,
          description: option.description ?? null,
        },
        value,
      ),
    );
  }
}
