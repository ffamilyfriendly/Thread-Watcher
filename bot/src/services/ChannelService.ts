import { Channel } from 'discord.js';
import { Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok } from 'neverthrow';
import { AdvancedFilterOptions } from 'utilities/commands/advanced_view';

export default class ChannelService {
  static readonly CACHE_TTL_SECONDS = 900;

  constructor(
    private db: Database,
    private redis: Redis,
  ) {}

  async get_channel(channel_id: string) {
    const cached = await this.redis.get(`channel:${channel_id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.isErr()) return err(parsed.error);
      else return ok(parsed.value);
    }

    const data = await this.db.get_channel(channel_id);
    if (data.isErr()) return err(data.error);

    const channel = data.value;
    if (!channel) return null;

    this.redis.set(
      `channel:${channel.id}`,
      JSON.stringify(channel),
      'EX',
      ChannelService.CACHE_TTL_SECONDS,
    );
  }

  async get_channels(guild_id: string) {
    const data = await this.db.get_channels_in_guild(guild_id);

    if (data.isOk()) {
      return ok(data.value);
    } else return err(data.error);
  }

  async add_channel(channel: Channel, filters?: AdvancedFilterOptions) {
    if (!('guild' in channel)) return err('wont happen');

    const channel_data = {
      id: channel.id,
      server: channel.guildId,
    };

    const filter_data = {
      tags: filters?.tags,
      role_whitelist: filters?.role_whitelist?.map((role) => role.id),
      regex: filters?.regex,
    };

    const res = await this.db.insert_channel(channel_data, filter_data);

    const combined_object = Object.assign(channel_data, filter_data);

    if (res.isOk()) {
      this.redis.set(
        `channel:${channel.id}`,
        JSON.stringify(combined_object),
        'EX',
        ChannelService.CACHE_TTL_SECONDS,
      );
    }

    return res;
  }
}
