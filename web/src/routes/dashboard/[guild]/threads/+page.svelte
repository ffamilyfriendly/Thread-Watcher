<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import StringPicker from '$lib/components/ui/settings/StringPicker.svelte';
	import Thread from '$lib/components/ui/threads/Thread.svelte';
	import { guild_state } from '$lib/stores/guild.svelte';
	import btn_style from '$lib/style/button.module.scss';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}
	const data: Props = $props();

	const watched_threads = data.data.watched_threads;
	const page_id = $derived(Number(page.url.searchParams.get('page')));

	let filter_monitor = $state<string | null>(page.url.searchParams.get('monitor'));
	let filter_channel = $state<string>();

	let search_url = $state<string>();

	$effect(() => {
		let url_segments = [`page=${page_id}`];

		if (filter_monitor) {
			url_segments.push(`monitor=${filter_monitor}`);
		}

		if (filter_channel) {
			url_segments.push(`parent=${filter_channel}`);
		}

		search_url = '?' + url_segments.join('&');
	});
</script>

<main>
	{#key watched_threads}
		<div class="items">
			{#each watched_threads as thread (thread.thread_id)}
				<Thread {thread} />
			{/each}
		</div>
	{/key}

	<div class="filters">
		{#if guild_state.guild_id}
			<div>
				<h3>In Channel</h3>
				<ChannelPicker
					bind:value={filter_channel}
					guild_id={guild_state.guild_id}
					channels={guild_state.channels}
				/>
			</div>
		{/if}
		{#if guild_state.guild_id}
			<div>
				<h3>By Monitor</h3>
				<StringPicker
					bind:value={filter_monitor}
					options={data.data.monitors.map((m) => ({ name: m.target_id, id: m.target_id }))}
				/>
			</div>
		{/if}

		<div class="button_row">
			<a class={[btn_style.button, btn_style.primary]} href={search_url}>Search</a>
		</div>
	</div>
</main>

<style type="scss">
	main {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
	}

	.filters {
		background-color: color-mix(in srgb, var(--primary-500) 10%, transparent);
		outline: 1px solid color-mix(in srgb, var(--primary-600), transparent);
		padding: 1rem;
		min-width: 300px;
		border-radius: 0.5rem;
		height: fit-content;
	}

	.items {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
