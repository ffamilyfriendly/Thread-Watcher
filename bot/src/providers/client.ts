import { Client, GatewayIntentBits, Options } from 'discord.js';
import { create_singleton } from './singleton';

const singleton = create_singleton(
  () =>
    new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],

      sweepers: {
        messages: {
          // We only handle messages in passing. There's no real need to cache
          interval: 300,
          lifetime: 600,
        },
      },
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: 50,
        GuildMemberManager: 200,
        UserManager: 500,
        ReactionManager: 0,
        ReactionUserManager: 0,
        GuildEmojiManager: 0,
        StageInstanceManager: 0,
        PresenceManager: 0,
      }),
    }),
);
export default singleton;
export const client = singleton.instance;
