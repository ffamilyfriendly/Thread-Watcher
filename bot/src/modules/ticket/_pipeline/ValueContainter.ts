import { StringSelectOption } from '@watcher/shared';
import { ContractLeafValue, ContractObject, ContractType } from '@watcher/shared/tickets/contracts';
import { APIRole, Attachment, Channel, Role, User } from 'discord.js';

export type ValueContainerValue =
  | ContractLeafValue
  | (() => ContractLeafValue)
  | ValueContainer
  | ValueContainer[];
export type MappedProps = Record<string, ContractLeafValue | Record<string, unknown> | unknown[]>;

export class ValueContainer {
  is_activated = true;
  constructor(
    public exports: Record<string, ValueContainerValue>,
    private default_value: ContractLeafValue,
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

  get(keys: string[]): ContractLeafValue {
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

  static value_into_string(value: ContractLeafValue, variable_name?: 'Unknown'): string {
    if (value === null) return `\`? ${variable_name} ?\``;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    return value;
  }

  static string_into_args(str: string) {
    return str.split('.');
  }

  static from_contract<Tname extends ContractType>(
    _contract_name: Tname,
    object: ContractObject<Tname>,
    default_value: ContractLeafValue,
  ) {
    return new ValueContainer(object, default_value);
  }

  static from_role(role: Role | APIRole): ValueContainer {
    return this.from_contract('ROLE', { id: role.id, name: role.name }, role.id);
  }

  static from_roles(roles: (Role | APIRole)[]): ValueContainer[] {
    return roles.map((r) => this.from_role(r));
  }

  static from_user(user: User): ValueContainer {
    return this.from_contract(
      'USER',
      { id: user.id, username: user.username, tag: `<@${user.id}>` },
      user.id,
    );
  }

  static from_users(users: User[]): ValueContainer[] {
    return users.map((user) => this.from_user(user));
  }

  static from_channel(channel: Channel): ValueContainer {
    let name = 'name' in channel ? channel.name : null;

    return this.from_contract('CHANNEL', { id: channel.id, name }, channel.id);
  }

  static from_channels(channels: Channel[]): ValueContainer[] {
    return channels.map((ch) => this.from_channel(ch));
  }

  static from_string_select(value: string, options: StringSelectOption[]): ValueContainer {
    const option = options.find((opt) => opt.option_id === value);

    const title = option?.title ?? null;
    const description = option?.description ?? null;

    return this.from_contract(
      'STRINGSELECT',
      { id: value, label: title, description: description },
      value,
    );
  }

  static from_string_selections(values: string[], options: StringSelectOption[]): ValueContainer[] {
    return values.map((v) => this.from_string_select(v, options));
  }

  static from_file(file: Attachment) {
    return this.from_contract(
      'FILE',
      {
        width: file.width,
        height: file.height,
        size: file.size,
        duration: file.duration,
        title: file.title,
        name: file.name,
        description: file.description,
        spoiler: file.spoiler,
        url: file.url,
        proxy_url: file.proxyURL,
        content_type: file.contentType,
      },
      file.id,
    );
  }

  static from_files(files: Attachment[]) {
    return files.map((f) => this.from_file(f));
  }

  static from_dump(
    dump: Record<string, unknown>,
    default_value: ContractLeafValue = null,
  ): ValueContainer {
    const exports: Record<string, ValueContainerValue> = {};

    for (const [key, value] of Object.entries(dump)) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        exports[key] = value;
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          exports[key] = value.map((item) => this.from_dump(item as Record<string, unknown>));
        }
      } else if (typeof value === 'object' && value !== null) {
        const child_default = (value as any).id ?? null;
        exports[key] = this.from_dump(value as Record<string, unknown>, child_default);
      }
    }

    return new ValueContainer(exports, default_value);
  }
}
