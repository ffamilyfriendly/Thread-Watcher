import { entitlement_service } from '@providers/services/entitlement_service';
import { EditMonitor, FilterData, ZChannelDataWithFilters } from '@watcher/shared';
import { Channel } from 'discord.js';
import { Database } from 'interfaces/Database';
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

  async add_channel(monitor_id: string, guild_id: string, filters?: FilterData) {
    const channel_data = {
      id: monitor_id,
      server: guild_id,
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
      this.r.set(monitor_id, combined_object, ZChannelDataWithFilters);
    }

    return res;
  }

  async edit_monitor(channel_id: string, edit_obj: EditMonitor) {
    await this.r.del(channel_id);
    return await this.db.edit_monitor(channel_id, edit_obj);
  }

  async remove_channel(channel_id: string) {
    await this.r.del(channel_id);
    return await this.db.delete_channel(channel_id);
  }
}
