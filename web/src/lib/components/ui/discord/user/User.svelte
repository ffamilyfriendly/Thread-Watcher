<script lang="ts" module>
	export interface UserComponentProps {
		style?: 'full' | 'inline';
	}
</script>

<script lang="ts">
	import type { DiscordUser } from '@watcher/shared';

	interface Props extends UserComponentProps {
		user: DiscordUser;
	}

	const { user, style = 'full' }: Props = $props();

	let user_pfp = $derived.by(() => {
		if (!user) return 'https://cdn.discordapp.com/embed/avatars/3.png';
		if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=80`;
		return user.defaultAvatarURL;
	});

	let displayname = $derived(user.globalName ?? user.username);
</script>

<div class="user {style}">
	<img src={user_pfp} alt="Avatar of {displayname}" />
	<div>
		<p class="displayname">{displayname}</p>
		<p class="username">{user.username}</p>
		<small class="user_id">{user.id}</small>
	</div>
</div>

<style lang="scss">
	.user {
		img {
			border-radius: 50%;
		}

		&.full {
			display: flex;
			font-size: 1.1rem;
			align-items: center;
			gap: 0.5rem;

			img {
				height: 2rem;
			}

			small {
				opacity: 0.7;
			}

			.username {
				display: none;
			}
		}

		&.inline {
			display: inline-flex;
			align-items: center;
			vertical-align: middle;
			gap: 0.25rem;

			img {
				height: 1rem;
			}

			.user_id {
				display: none;
			}
			.displayname {
				display: none;
			}
		}
	}
</style>
