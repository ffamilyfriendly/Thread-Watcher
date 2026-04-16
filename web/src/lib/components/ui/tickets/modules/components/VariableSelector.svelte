<script lang="ts">
	import { click_outside } from '$lib/client/attachments/click_outside';
	import { portal } from '$lib/client/attachments/portal';
	import { use_pipeline } from '$lib/stores/pipeline.svelte';
	import {
		ArrowRightFromLine,
		Info,
		List,
		ListCheck,
		ListIcon,
		Percent,
		TextInitial
	} from '@lucide/svelte';
	import { type ModuleProperty } from '@watcher/shared';
	import { fly } from 'svelte/transition';

	const pipe_state = use_pipeline();

	interface Props {
		on_selected: (selected: string) => void;
		before_uid?: string;
		show_this?: boolean;
		input_ref: HTMLElement;
	}
	let { on_selected, before_uid, show_this = $bindable(), input_ref }: Props = $props();

	let modules = $state(pipe_state.get_all_properties());

	$effect(() => {
		if (before_uid) {
			modules = pipe_state.get_properties_before(before_uid);
		}
	});

	let selected_index = $state(0);

	const flat_options = $derived.by(() => {
		const list: { path: string; name: string; type: string }[] = [];

		const walk = (key: string, values: ModuleProperty[], prev_path?: string, is_array = false) => {
			const current_segment = key + (is_array ? '[0]' : '');
			const current_path = prev_path ? `${prev_path}.${current_segment}` : current_segment;

			values.forEach((v) => {
				if (Array.isArray(v.value)) {
					walk(v.name, v.value, key, v.is_array);
				} else {
					list.push({
						path: `${current_path}.${v.name}`,
						name: v.name,
						type: v.value
					});
				}
			});
		};

		for (const [key, values] of modules.entries()) {
			walk(key, values);
		}

		return list;
	});

	function handle_keydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selected_index = (selected_index + 1) % flat_options.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selected_index = (selected_index - 1 + flat_options.length) % flat_options.length;
				break;
			case 'Enter':
				e.preventDefault();
				if (flat_options[selected_index]) {
					selection_made(flat_options[selected_index].path);
				}
				break;
			case 'Backspace':
				show_this = false;
				break;
		}
	}

	function selection_made(variable: string) {
		if (show_this) show_this = false;
		console.log('VARIABLE', variable);
		on_selected(variable);
	}

	function str_to_vibrant_clr(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		const hue = Math.abs(hash) % 360;

		const sat = 80;
		const light = 65;

		return `hsl(${hue}, ${sat}%, ${light}%)`;
	}
</script>

<svelte:window onkeydown={handle_keydown} />

{#snippet get_icon(v: ModuleProperty, size = 16)}
	{#if v.value == 'number'}
		<Percent {size} />
	{:else if v.value == 'string'}
		<TextInitial {size} />
	{:else if Array.isArray(v.value)}
		<List {size} />
	{:else}
		<ArrowRightFromLine {size} />
	{/if}
{/snippet}

{#snippet show_value(key: string, values: ModuleProperty[], prev_path?: string, is_array = false)}
	{@const current_segment = key + (is_array ? '[0]' : '')}
	{@const current_path = prev_path ? `${prev_path}.${current_segment}` : current_segment}

	<div class="section" style="--side_clr: {str_to_vibrant_clr(key)};">
		<span class="name">
			{#if is_array}<ListIcon color={'white'} size={'1rem'} />{/if}
			{key}
		</span>
		<ul>
			{#each values as value}
				{#if Array.isArray(value.value)}
					{@render show_value(value.name, value.value, current_path, value.is_array)}
				{:else}
					{@const full_path = `${current_path}.${value.name}`}
					{@const is_active = flat_options[selected_index]?.path === full_path}

					<li class="row" class:active={is_active}>
						<button
							type="button"
							onclick={() => selection_made(full_path)}
							class="click_event_wrapper"
						>
							{@render get_icon(value)}
							<p>{value.name}</p>
							{#if value.description}
								<p class="description">{value.description}</p>
							{/if}
						</button>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/snippet}

<div
	class="selector"
	{@attach portal(input_ref)}
	{@attach show_this && click_outside(() => (show_this = false))}
	transition:fly={{ duration: 200 }}
>
	{#each modules.entries() as [key, values] (key)}
		{@render show_value(key, values)}
	{/each}
</div>

<style lang="scss">
	.selector {
		top: 1px;
		background-color: color-mix(in srgb, var(--clr) 97%, white);
		outline: 1px solid color-mix(in srgb, var(--clr) 90%, white);
		font-family: 'JetBrains Mono', monospace;
		z-index: 99999;
		border-radius: 0.1rem;
		position: absolute;
		font-size: small;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 300px;
		width: max-content;
		padding: 1rem;

		backdrop-filter: blur(10px);
	}

	.click_event_wrapper {
		display: contents;
		color: inherit;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.15rem;

		.description {
			opacity: 0.6;
		}

		&:hover,
		&.active {
			background-color: color-mix(in srgb, var(--side_clr, white) 25%, transparent);
		}
	}

	.section {
		cursor: pointer;

		& * {
			cursor: pointer;
		}

		.name {
			color: color-mix(in srgb, var(--side_clr, white) 50%, white);
			font-weight: bold;
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		border-left: 2px solid var(--side_clr, var(--primary-800));
		padding-left: 0.3rem;
	}
</style>
