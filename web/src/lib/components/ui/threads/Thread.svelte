<script lang="ts">
	import { guild_state } from '$lib/stores/guild.svelte';
	import type { HydratedThreadData } from '@watcher/shared';

	interface Props {
		thread: HydratedThreadData;
	}

	const { thread }: Props = $props();
</script>

<div class="watched_thread">
	<div class="head">
		<a
			class="thread_name"
			href="https://discord.com/channels/{guild_state.guild_id}/{thread.thread_id}"
		>
			<span>{thread.display_name}</span>
		</a>

		{#if thread.parent_channel}
			{@const p = thread.parent_channel}
			<a href="https://discord.com/channels/{guild_state.guild_id}/{p.channel_id}"
				>{p.display_name}</a
			>
		{/if}
	</div>

	{#if thread.managed_by}
		This Thread was added automatically. <a href="./monitors#focus_{thread.managed_by}"
			>View Monitor</a
		>
	{/if}
</div>

<style lang="scss">
	:global(.parent_channel_link) {
		background-color: transparent !important;
		gap: 0.1rem !important;
		font-size: smaller;
		opacity: 0.7;
	}

	:global(.parent_channel_link > svg) {
		height: 1rem;
		width: 1rem;
	}

	.thread_name {
		text-decoration: none;
		color: inherit;
		font-weight: bold;
	}

	.watched_thread {
		outline: 1px solid var(--secondary-600);
		padding: 0.5rem;
		border-radius: 0.5rem;
	}

	.head {
		display: flex;
		align-items: center;
	}
</style>
