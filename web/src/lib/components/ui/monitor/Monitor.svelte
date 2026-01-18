<script lang="ts">
	import type { ChannelMonitor, DiscordChannel } from '$lib/types/internal_api';
	import btn_style from '$lib/style/button.module.scss';
	import FallBackChannel from '../discord/FallBackChannel.svelte';
	import { CirclePause, CirclePower, Trash } from '@lucide/svelte';

	interface Props {
		channels: DiscordChannel[];
		guild_id: string;
		monitor: ChannelMonitor;
	}

	const { monitor, channels, guild_id, ...rest }: Props = $props();

	const channel_obj = $derived(channels.find((c) => c.id === monitor.id));
</script>

<div class="monitor">
	<div class="pill">
		<p>Target</p>
		<FallBackChannel channel_id={monitor.id} {guild_id} channel={channel_obj} />
	</div>

	<div class="buttons">
		<button class={[btn_style.button, btn_style.tetriary]}>
			{#if monitor.is_suspended}
				<CirclePower />
			{:else}
				<CirclePause />
			{/if}
		</button>
		<button class={[btn_style.button, btn_style.tetriary]}>
			<Trash />
		</button>
	</div>
</div>

<style lang="scss">
	.monitor {
		padding: 1rem;
		outline: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		display: flex;
		justify-content: space-between;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		width: fit-content;
		padding: 0.5rem 1rem;
		border-radius: 0.75rem;
		outline: 1px solid var(--primary-500);
	}
</style>
