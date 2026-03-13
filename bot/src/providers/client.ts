import { Client, GatewayIntentBits } from 'discord.js';
import { create_singleton } from './singleton';

const singleton = create_singleton(
  () =>
    new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    }),
);
export default singleton;
export const client = singleton.instance;
