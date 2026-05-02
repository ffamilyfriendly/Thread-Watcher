import { ShardingManager } from 'discord.js';
import { create_singleton } from './singleton';
import { config } from './config';

const singleton = create_singleton(() => {
  const args = process.argv.slice(2);
  return new ShardingManager('./src/bot.ts', {
    token: config.tokens.discord,
    shardArgs: args,
    respawn: false,
  });
});
export default singleton;
export const sharding_manager = singleton.instance;
