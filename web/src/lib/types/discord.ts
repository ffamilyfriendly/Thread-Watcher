interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	banner: string | null;
	owner: boolean;
	permissions: number;
	permissions_new: number;
	features: unknown[];
}

interface DiscordGuildExpanded extends DiscordGuild {
	can_add: boolean;
	guild_has_bot: boolean;
	should_not_show: boolean;
	action_link: string;
}
