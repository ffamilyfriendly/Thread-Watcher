<script lang="ts">
	import type { TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import ChannelPicker from '../../settings/ChannelPicker.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';

	const guild_state = use_guild_state()

	interface Props {
		module: TypedPipelineModule<'ASSIGN_CHANNEL'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="Assign Channel" bind:module>
	{#snippet description()}
		Sets which channel the ticket thread will be created in. Use this to route different types of tickets to the appropriate channel
	{/snippet}

	{#if guild_state.guild_id}
		<ChannelPicker
			bind:value={module.channel_id}
			guild_id={guild_state.guild_id}
			channels={guild_state.channels}
		/>
	{/if}
</BaseModule>
