<script lang="ts">
	import { fetch_as_json } from '$lib/client/fetch';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { ZDiscordChannel, type DiscordChannel } from '$lib/types/internal_api';
	import Channel from './Channel.svelte';

	const guild_state = use_guild_state();

	interface Props {
		channel?: DiscordChannel;
		channel_id: string;
		clickable?: boolean;
		class_name?: string;
		icon_size?: number;
	}

	const { channel, channel_id, clickable, class_name, icon_size }: Props = $props();

	let fetched_channel = $state<DiscordChannel | null>(null);

	const use_channel = $derived(channel ?? fetched_channel);

	$effect(() => {
		if (!channel && guild_state.guild_id) {
			fetch_as_json(
				`/api/fetch_channel?guild_id=${guild_state.guild_id}&channel_id=${channel_id}`,
				undefined,
				ZDiscordChannel
			).then((res) => {
				if (res.isErr()) {
					console.error('could not fetch channel', res.error);
					return;
				}

				fetched_channel = res.value;
			});
		}
	});
</script>

{#if use_channel}
	<Channel {icon_size} {class_name} {clickable} channel={use_channel} />
{:else}
	<p>Unknown Channel</p>
{/if}
