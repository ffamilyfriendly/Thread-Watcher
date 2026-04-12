import { Collection } from 'discord.js';
import { create_singleton } from './singleton';
import { BaseCommand } from '#/interfaces/BaseCommandInterface';

const singleton = create_singleton(() => new Collection<string, BaseCommand>());
export default singleton;
export const commands = singleton.instance;
