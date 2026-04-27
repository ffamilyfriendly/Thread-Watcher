import { Client, GatewayIntentBits, Options } from 'discord.js';
import { create_singleton } from './singleton';

const singleton = create_singleton(
  () =>
    new Client({
      // TODO: Add MessageContent back when Discord grants the intent.
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],

      sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: {
          // We only handle messages in passing. There's no real need to cache
          interval: 300,
          lifetime: 600,
        },
      },
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        AutoModerationRuleManager: 0,
        BaseGuildEmojiManager: 0,
        DMMessageManager: 0,
        GuildBanManager: 0,
        GuildEmojiManager: 0,
        MessageManager: 0,
        GuildMemberManager: {
          maxSize: 20,
          keepOverLimit: (member) => member.id === member.client.user.id,
        },
        UserManager: 100,
        ReactionManager: 0,
        ReactionUserManager: 0,
        StageInstanceManager: 0,
        PresenceManager: 0,
      }),
    }),
);
export default singleton;
export const client = singleton.instance;
