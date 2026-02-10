<script lang="ts">
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import { guild_state } from '$lib/stores/guild.svelte';
	import type { DiscordChannel } from '$lib/types/internal_api';
	import type { ThreadData } from '@watcher/shared';
	import FallBackChannel from '../discord/FallBackChannel.svelte';

	interface Props {
		thread: ThreadData;
	}

	const { thread }: Props = $props();

	let channel_data = $state<DiscordChannel>();

	$effect(() => {
		if (!guild_state.is_ready) return;
		guild_state.get_channel(thread.thread_id).then((res) => {
			if (res.isErr()) {
				return add_toast_from_error(res.error);
			}

			channel_data = res.value;
		});
	});
</script>

<div class="watched_thread">
	<div class="head">
		<a
			class="thread_name"
			href="https://discord.com/channels/{guild_state.guild_id}/{thread.thread_id}"
		>
			<span>{channel_data?.name ?? 'NO NAME'}</span>
		</a>

		{#if channel_data?.parentId}
			<FallBackChannel
				class_name="parent_channel_link"
				clickable={true}
				channel_id={channel_data?.parentId}
			/>
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
