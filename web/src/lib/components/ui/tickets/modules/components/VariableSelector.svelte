<script lang="ts">
	import { use_pipeline } from '$lib/stores/pipeline.svelte';
	import { ArrowRightFromLine, Percent, TextInitial } from '@lucide/svelte';
	import { type ModuleProperty } from '@watcher/shared';
	import { fly } from 'svelte/transition';
	import { string } from 'zod';

	const pipe_state = use_pipeline();

	interface Props {
		on_selected: (selected: string) => void;
		before_uid?: string;
		show_this?: boolean;
	}
	let { on_selected, before_uid, show_this = $bindable() }: Props = $props();

	let modules = $state(pipe_state.get_all_properties());

	function focus(node: HTMLDivElement) {
		node.focus();
	}

	$effect(() => {
		if (before_uid) {
			modules = pipe_state.get_properties_before(before_uid);
		}
	});

	let selected_index = $state(0);

	const flat_options = $derived.by(() => {
		const list: { path: string; name: string; type: string }[] = [];

		const walk = (key: string, values: ModuleProperty[], prev_key?: string) => {
			values.forEach((v) => {
				if (Array.isArray(v.value)) {
					walk(v.name, v.value, key);
				} else {
					list.push({
						path: [prev_key, key, v.name].filter(Boolean).join('.'),
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
		}
	}

	function handle_win_click(e: MouseEvent) {
		e.target;
	}

	function selection_made(variable: string) {
		if (show_this) show_this = false;
		on_selected(variable);
	}
</script>

<svelte:window onclick={handle_win_click} onkeydown={handle_keydown} />

{#snippet get_icon(v: ModuleProperty, size = 16)}
	{#if v.value == 'number'}
		<Percent {size} />
	{:else if v.value == 'string'}
		<TextInitial {size} />
	{:else}
		<ArrowRightFromLine {size} />
	{/if}
{/snippet}

{#snippet show_value(key: string, values: ModuleProperty[], prev_key?: string)}
	<div use:focus class="section">
		{key}
		<ul>
			{#each values as value}
				{#if Array.isArray(value.value)}
					{@render show_value(value.name, value.value, key)}
				{:else}
					{@const path = [prev_key, key, value.name].filter(Boolean).join('.')}
					{@const is_active = flat_options[selected_index]?.path === path}
					<li class="row" class:active={is_active}>
						<button
							onclick={() => selection_made([prev_key, key, value.name].filter(Boolean).join('.'))}
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

<div class="selector" transition:fly={{ duration: 200 }}>
	{#each modules.entries() as [key, values] (key)}
		{@render show_value(key, values)}
	{/each}
</div>

<style lang="scss">
	.selector {
		background-color: color-mix(in srgb, var(--clr) 97%, white);
		outline: 1px solid color-mix(in srgb, var(--clr) 90%, white);
		font-family: 'JetBrains Mono', monospace;
		z-index: 99999;
		padding: 0.5rem;
		border-radius: 0.1rem;
		position: absolute;
		font-size: small;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 300px;

		opacity: 0.9;
		backdrop-filter: blur(10px);
	}

	.click_event_wrapper {
		display: contents;
		color: inherit;
		cursor: pointer;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: 0.25rem;

		.description {
			opacity: 0.6;
		}

		&:hover {
			background-color: red;
		}

		&.active {
			background-color: green;
		}
	}

	.section {
		border-left: 1px solid red;
		padding-left: 0.25rem;
	}
</style>
