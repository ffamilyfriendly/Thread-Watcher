import { fetch_as_json } from '$lib/client/fetch';
import {
	ZDiscordChannel,
	ZDiscordRole,
	type DiscordChannel,
	type DiscordRole,
	type GuildOverview
} from '$lib/types/internal_api';
import { ok } from 'neverthrow';

class GuildState {
	roles = $state<DiscordRole[]>([]);
	channels = $state<DiscordChannel[]>([]);
	guild_id = $state<string>('');
	guild = $state<GuildOverview>();

	set_roles(new_roles: DiscordRole[]) {
		this.roles = new_roles;
	}

	set_guild_id(new_guild_id: string) {
		this.guild_id = new_guild_id;
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
}

export const guild_state = new GuildState();
