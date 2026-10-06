import { Callback, SecurePrivateEvent } from '#/interfaces/PrivateEvents';
import {
  ZAuditData,
  ZDiscordChannel,
  ZDiscordMessage,
  ZDiscordUser,
  ZDJSGuild,
} from '@watcher/shared';
import z from 'zod';

interface EnsuredSchemaCall<E extends z.ZodType, R extends z.ZodType> {
  event_name: string;
  return_schema: R;
  expected_data: E;
}

export const TYPED_EVENTS = {
  send_embed: {
    event_name: 'send_embed',
    expected_data: z.object({ panel_id: z.string(), channel_id: z.string() }),
    return_schema: z.object({ message_id: z.string() }),
  },
  fetch_users: {
    event_name: 'fetch_users',
    expected_data: z.object({ user_ids: z.array(z.string()), guild_id: z.string() }),
    return_schema: z.array(ZDiscordUser),
  },
  fetch_channel: {
    event_name: 'fetch_channel',
    expected_data: z.object({
      channel_id: z.string(),
      guild_id: z.string(),
      bypass_guild_id_check: z.boolean().nullish(),
    }),
    return_schema: ZDiscordChannel.nullable(),
  },
  fetch_message: {
    event_name: 'fetch_message',
    expected_data: z.object({
      channel_id: z.string(),
      guild_id: z.string(),
      message_id: z.string(),
    }),
    return_schema: ZDiscordMessage.nullable(),
  },
  user_has_role: {
    event_name: 'user_has_role',
    expected_data: z.object({
      role_ids: z.array(z.string()),
      guild_id: z.string(),
      user_id: z.string(),
    }),
    return_schema: z.boolean(),
  },
  mark_ticket_resolved: {
    event_name: 'mark_ticket_resolved',
    expected_data: z.object({
      ticket_id: z.string(),
      user_id: z.string(),
    }),
    return_schema: z.void(),
  },
  bus_event: {
    event_name: 'bus_event',
    expected_data: ZAuditData.omit({ id: true, timestamp: true }).extend({ event_key: z.string() }),
    return_schema: z.void(),
  },
  get_guild: {
    event_name: 'get_guild',
    expected_data: z.object({
      guild_id: z.string(),
    }),
    return_schema: ZDJSGuild,
  },
} satisfies Record<string, EnsuredSchemaCall<z.ZodType, z.ZodType>>;

export function define_typed_event<K extends keyof typeof TYPED_EVENTS>(
  event_name: K,
  callback: Callback<
    z.output<(typeof TYPED_EVENTS)[K]['expected_data']>,
    z.output<(typeof TYPED_EVENTS)[K]['return_schema']>
  >,
): SecurePrivateEvent<K> {
  return {
    event_name,
    event_callback: callback,
  };
}
