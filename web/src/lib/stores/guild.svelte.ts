import { fetch_as_json } from '$lib/client/fetch';
import {
	ZDiscordChannel,
	ZDiscordRole,
	ZDiscordUser,
	type DiscordChannel,
	type DiscordRole,
	type DiscordUser,
	type GuildOverview
} from '$lib/types/internal_api';
import { ZGuildSubscription, ZMonitor, type Monitor } from '@watcher/shared';
import { err, ok, Result } from 'neverthrow';
import { getContext, setContext } from 'svelte';
import z from 'zod';

type UserFetchCallback = (v: Result<DiscordUser, unknown>) => void;

export class GuildState {
	roles = $state<DiscordRole[]>([]);
	channels = $state<DiscordChannel[]>([]);
	users = $state<Map<string, DiscordUser>>(new Map());
	guild_id = $state<string>();
	guild = $state<GuildOverview>();
	monitors = $state<Map<string, Monitor>>(new Map());
	is_subscribed = $state<boolean>();

	batch_wait_ms = 100;
	pending_users: Map<string, UserFetchCallback[]> = new Map();
	batch_timeout_id: number | NodeJS.Timeout | null = null;

	constructor(guild_id: string) {
		this.guild_id = guild_id;
	}

	get is_ready() {
		return !!this.guild_id;
	}

	get guild_id_throws() {
		if (!this.guild_id) throw new Error('guild_id was not set!');
		return this.guild_id;
	}

	async get_guild_subscription(guild_id: string) {
		const result = await fetch_as_json(
			`/api/guild/${guild_id}/subscription`,
			undefined,
			ZGuildSubscription
		);
		if (result.isOk()) this.is_subscribed = result.value.is_subscribed;
		return result;
	}

	set_roles(new_roles: DiscordRole[]) {
		this.roles = new_roles;
	}

	set_guild_id(new_guild_id: string) {
		this.guild_id = new_guild_id;
	}

	set_users(new_users: DiscordUser[]) {
		this.users = new Map(new_users.map((u) => [u.id, u]));
	}

	append_users(new_users: DiscordUser[]) {
		new_users.forEach((u) => this.users.set(u.id, u));
	}

	init(roles: DiscordRole[], channels: DiscordChannel[], guild: GuildOverview) {
		this.guild_id = guild.guild.id;
		this.guild = guild;
		this.roles = roles;
		this.channels = channels;
	}

	async get_role(role_id: string) {
		const found_role = this.roles.find((r) => r.id === role_id);
		if (found_role) return ok(found_role);

		const result = await fetch_as_json(
			`/api/fetch_role?guild_id=${this.guild_id}&role_id=${role_id}`,
			undefined,
			ZDiscordRole
		);

		if (result.isOk()) {
			this.roles = [...this.roles, result.value];
		}

		return result;
	}

	get_role_sync(role_id: string) {
		return this.roles.find((r) => r.id === role_id);
	}

	async get_channel(channel_id: string) {
		const found_channel = this.channels.find((ch) => ch.id === channel_id);
		if (found_channel) return ok(found_channel);

		const result = await fetch_as_json(
			`/api/fetch_channel?guild_id=${this.guild_id}&channel_id=${channel_id}`,
			undefined,
			ZDiscordChannel
		);

		if (result.isOk()) {
			this.channels = [...this.channels, result.value];
		}

		return result;
	}

	async fetch_monitor(monitor_id: string) {
		const cached_monitor = this.monitors.get(monitor_id);
		if (cached_monitor) return ok(cached_monitor);

		const result = await fetch_as_json(
			`/api/monitor?guild_id=${this.guild_id}&monitor_id=${monitor_id}`,
			undefined,
			ZMonitor
		);

		if (result.isOk()) {
			this.monitors.set(monitor_id, result.value);
		}

		return result;
	}

	async get_users(user_ids: string[]) {
		const result = await fetch_as_json(
			`/api/users`,
			{
				method: 'POST',
				body: JSON.stringify({ guild_id: this.guild_id, user_ids })
			},
			z.array(ZDiscordUser)
		);

		if (result.isErr()) return err(result.error);

		result.value.forEach((u) => this.users.set(u.id, u));

		return ok(result.value);
	}

	private get_user_debounce(user_id: string, callback: UserFetchCallback) {
		const existing = this.pending_users.get(user_id);

		if (existing) {
			existing.push(callback);
		} else {
			this.pending_users.set(user_id, [callback]);
		}

		this.batch_get_users();
	}

	private batch_get_users() {
		if (this.batch_timeout_id) return;
		if (this.pending_users.size === 0) return;

		this.batch_timeout_id = setTimeout(async () => {
			this.batch_timeout_id = null;
			const r = await this.get_users(this.pending_users.keys().toArray());
			if (r.isErr()) {
				this.pending_users.forEach((callbacks) => callbacks.forEach((callback) => callback(r)));
				return this.pending_users.clear();
			}

			for (const user of r.value) {
				this.pending_users.get(user.id)?.forEach((callback) => callback(ok(user)));
				this.pending_users.delete(user.id);
			}

			this.pending_users
				.values()
				.forEach((callbacks) =>
					callbacks.forEach((callback) => callback(err('could not fetch user')))
				);
			this.pending_users.clear();
		}, this.batch_wait_ms);
	}

	async get_user(user_id: string): Promise<Result<DiscordUser, unknown>> {
		const u_cached = this.users.get(user_id);
		if (u_cached) return ok(u_cached);

		return new Promise((resolve) => {
			this.get_user_debounce(user_id, (res) => {
				resolve(res);
			});
		});
	}

	get_user_cached(user_id: string): DiscordUser | null {
		return this.users.get(user_id) ?? null;
	}

	// Unsure if this is relevant anymore?
	resolve_snowflake(snowflake: unknown) {
		// For the convinience in ConfigChange we allow the snowflake parameter to be anything
		if (typeof snowflake !== 'string') return { entity_type: 'UNKNOWN' as const, data: snowflake };

		if (snowflake === this.guild_id)
			return { entity_type: 'GUILD' as const, data: this.guild?.guild };

		const channel = this.channels.find((ch) => ch.id === snowflake);
		if (channel) {
			return { entity_type: 'CHANNEL' as const, data: channel };
		}

		const role = this.roles.find((rl) => rl.id === snowflake);
		if (role) {
			return { entity_type: 'ROLE' as const, data: role };
		}

		return { entity_type: 'UNKNOWN' as const, data: null };
	}
}

const GUILDSTATE_KEY = Symbol('GUILDSTATE');

export function init_guild_state(guild_id: string) {
	return setContext(GUILDSTATE_KEY, new GuildState(guild_id));
}

export function use_guild_state() {
	const state = getContext<GuildState>(GUILDSTATE_KEY);
	if (!state) throw new Error('use_guild_state called outside of provider');
	return state;
}
