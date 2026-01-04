import { Channel } from 'discord.js';
import { ChannelDataWithFilters, Database } from 'interfaces/Database';
import Redis from 'ioredis';
import { err, ok, Result } from 'neverthrow';
import { safe_parse } from 'utilities/parsing';
import z from 'zod';

export const FormattedMonitoredChannel = z.object({
  id: z.string(),
  server: z.string(),

  tags: z
    .union([z.string(), z.array(z.string()), z.null()])
    .default(null)
    .transform<string[] | undefined>((val) => {
      if (!val) return undefined;
      if (val instanceof Array) return val;
      return val.split(',').map((t) => t.trim());
    }),

  role_whitelist: z
    .union([z.string(), z.array(z.string()), z.null()])
    .default(null)
    .transform<string[] | undefined>((val) => {
      if (!val) return undefined;
      if (val instanceof Array) return val;
      return val.split(',').map((t) => t.trim());
    }),

  regex: z
    .union([z.string(), z.null()])
    .default(null)
    .transform<RegExp | undefined>((val) => {
      if (!val) return undefined;
      return new RegExp(val.trim());
    }),
});

export type FormattedChannel = z.infer<typeof FormattedMonitoredChannel>;

export interface AdvancedFilterOptions {
  regex?: RegExp;
  tags?: string[];
  role_whitelist?: string[];
}

export default class ChannelService {
  static readonly CACHE_TTL_SECONDS = 900;

  constructor(
    private db: Database,
    private redis: Redis,
  ) {}

  async get_channel(channel_id: string) {
    const cached = await this.redis.get(`channel:${channel_id}`);
    if (cached) {
      const parsed = safe_parse(FormattedMonitoredChannel, JSON.parse(cached));
      if (parsed.isErr()) return err(parsed.error);
      else return ok(parsed.value);
    }

    const data = await this.db.get_channel(channel_id);
    if (data.isErr()) return err(data.error);

    const channel = data.value;
    if (!channel) return ok(null);

    this.redis.set(
      `channel:${channel.id}`,
      JSON.stringify(channel),
      'EX',
      ChannelService.CACHE_TTL_SECONDS,
    );

    const parsed = safe_parse(FormattedMonitoredChannel, channel);
    if (parsed.isErr()) return err(parsed.error);
    else return ok(parsed.value);
  }

  async get_channels(guild_id: string) {
    const data = await this.db.get_channels_in_guild(guild_id);

    if (data.isOk()) {
      return ok(data.value);
    } else return err(data.error);
  }

  async get_count_channels(guild_id: string) {
    return await this.db.get_monitored_channels_count(guild_id);
  }

  async add_channel(channel: Channel, filters?: AdvancedFilterOptions) {
    if (!('guild' in channel)) return err('wont happen');

    const channel_data = {
      id: channel.id,
      server: channel.guildId,
    };

    const filter_data = {
      tags: filters?.tags,
      role_whitelist: filters?.role_whitelist,
      regex: filters?.regex?.source,
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

  async remove_channel(channel_id: string) {
    await this.redis.del(`channel:${channel_id}`);
    return await this.db.delete_channel(channel_id);
  }
}
