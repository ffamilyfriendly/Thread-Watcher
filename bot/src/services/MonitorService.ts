import { entitlement_service } from '@providers/services/entitlement_service';
import { EditMonitor, FilterData, ZMonitor } from '@watcher/shared';
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

  async get_monitor(channel_id: string) {
    const cached = await this.r.get(channel_id, ZMonitor);
    if (cached.isErr()) return err(cached.error);
    if (cached.value) return ok(cached.value);

    const db_res = await this.db.get_monitor(channel_id);
    return db_res.andThen((raw) => {
      if (!raw) return ok(null);

      this.r.set(channel_id, raw, ZMonitor);

      return ok(raw);
    });
  }

  get_monitors(guild_id: string) {
    return this.db.get_monitors_in_guild(guild_id);
  }

  async get_monitor_count(guild_id: string) {
    return await this.db.get_monitors_count(guild_id);
  }

  async add_monitor(monitor_id: string, guild_id: string, filters?: FilterData) {
    const channel_data = {
      target_id: monitor_id,
      guild_id: guild_id,
      is_suspended: false,
    };

    const filter_data = {
      tags: filters?.tags ?? null,
      role_whitelist: filters?.role_whitelist ?? null,
      regex: filters?.regex,
    };

    const res = await this.db.insert_monitor(channel_data, filter_data);

    const combined_object = Object.assign(channel_data, filter_data);

    if (res.isOk()) {
      this.r.set(monitor_id, combined_object, ZMonitor);
    }

    return res;
  }

  async edit_monitor(channel_id: string, edit_obj: EditMonitor) {
    await this.r.del(channel_id);
    return await this.db.edit_monitor(channel_id, edit_obj);
  }

  async remove_monitor(channel_id: string) {
    await this.r.del(channel_id);
    return await this.db.delete_monitor(channel_id);
  }
}
