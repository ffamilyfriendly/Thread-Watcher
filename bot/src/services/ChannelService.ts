import { Channel } from 'discord.js';
import { Database, FilterData, ZChannelDataWithFilters } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok } from 'neverthrow';
import RedisWrapper from 'utilities/redis';

export default class ChannelService {
  static readonly CACHE_TTL_SECONDS = 900;
  private r: RedisWrapper;

  constructor(
    private db: Database,
    redis: Redis,
  ) {
    this.r = new RedisWrapper(redis, ChannelService.CACHE_TTL_SECONDS, 'channel');
  }

  async get_channel(channel_id: string) {
    const cached = await this.r.get(channel_id, ZChannelDataWithFilters);
    if (cached.isErr()) return err(cached.error);
    if (cached.value) return ok(cached.value);

    const db_res = await this.db.get_channel(channel_id);
    return db_res.andThen((raw) => {
      if (!raw) return ok(null);

      this.r.set(channel_id, raw, ZChannelDataWithFilters);

      return ok(raw);
    });
  }

  get_channels(guild_id: string) {
    return this.db.get_channels_in_guild(guild_id);
  }

  async get_count_channels(guild_id: string) {
    return await this.db.get_monitored_channels_count(guild_id);
  }

  async add_channel(channel: Channel, filters?: FilterData) {
    if (!('guild' in channel)) return err('wont happen');

    const channel_data = {
      id: channel.id,
      server: channel.guildId,
      is_suspended: false,
    };

    const filter_data = {
      tags: filters?.tags ?? null,
      role_whitelist: filters?.role_whitelist ?? null,
      regex: filters?.regex,
    };

    const res = await this.db.insert_channel(channel_data, filter_data);

    const combined_object = Object.assign(channel_data, filter_data);

    if (res.isOk()) {
      this.r.set(channel.id, combined_object, ZChannelDataWithFilters);
    }

    return res;
  }

  async remove_channel(channel_id: string) {
    await this.r.del(channel_id);
    return await this.db.delete_channel(channel_id);
  }
}
