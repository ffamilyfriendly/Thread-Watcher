<script lang="ts">
	import { guild_state } from '$lib/stores/guild.svelte';
	import type { DiscordChannel } from '$lib/types/internal_api';
	import { Folder, Hash, Megaphone, MessagesSquare, Spool } from '@lucide/svelte';

	interface Props {
		channel: DiscordChannel;
		clickable?: boolean;
		class_name?: string;
	}

	const { channel, clickable = false, class_name }: Props = $props();

	const Icon = $derived.by(() => {
		switch (channel.type) {
			case 0: // GUILD_TEXT
				return Hash;
			case 4: // GUILD_CATEGORY
				return Folder;
			case 5: // GUILD_ANNOUNCEMENT
				return Megaphone;
			case 11: // PUBLIC_THREAD
			case 12: // PRIVATE_THREAD
				return Spool;
			case 15:
				return MessagesSquare;
			default:
				return Hash;
		}
	});
</script>

{#if clickable}
	<a target="_blank" href="https://discord.com/channels/{guild_state.guild_id}/{channel.id}">
		<p class={class_name}><Icon /> {channel.name}</p>
	</a>
{:else}
	<p class={class_name}><Icon /> {channel.name}</p>
{/if}

<style lang="scss">
	p {
		--colour: white;
		padding: 0.25rem 0.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 0.2rem;
		font-weight: bold;
		background-color: color-mix(in srgb, var(--colour) 20%, transparent);
		color: var(--colour);
	}
</style>
