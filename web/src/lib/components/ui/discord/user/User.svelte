<script lang="ts">
	import type { DiscordUser } from '@watcher/shared';

	interface Props {
		user: DiscordUser;
	}

	const { user }: Props = $props();

	let user_pfp = $derived.by(() => {
		if (!user) return 'https://cdn.discordapp.com/embed/avatars/3.png';
		if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=80`;
		return user.defaultAvatarURL;
	});

	let username = $derived(user.globalName ?? user.username);
</script>

<div class="user">
	<img src={user_pfp} alt="Avatar of {username}" />
	<div>
		<p>{username}</p>
		<small>{user.id}</small>
	</div>
</div>

<style lang="scss">
	.user {
		display: flex;
		font-size: 1.1rem;
		align-items: center;
		gap: 0.5rem;

		img {
			height: 2rem;
			border-radius: 50%;
		}

		small {
			opacity: 0.7;
		}
	}
</style>
