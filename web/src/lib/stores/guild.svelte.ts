import type { DiscordChannel, DiscordRole, GuildOverview } from '$lib/types/internal_api';

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
}

export const guild_state = new GuildState();
