<script lang="ts">
	import { use_pipeline } from '$lib/stores/pipeline.svelte';
	import { ArrowRightFromLine, Percent, TextInitial } from '@lucide/svelte';
	import { type ModuleProperty } from '@watcher/shared';
	import style from '$lib/style/pipeline.module.scss';
	import { fly } from 'svelte/transition';

	const pipe_state = use_pipeline();

	interface Props {
		on_selected: (selected: string) => void;
		before_uid?: string;
	}
	const { on_selected, before_uid }: Props = $props();

	let modules = $state(pipe_state.get_all_properties());

	$effect(() => {
		if (before_uid) {
			modules = pipe_state.get_properties_before(before_uid);
		}
	});
</script>

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
	<div class="section">
		{key}
		{#each values as value}
			{#if Array.isArray(value.value)}
				{@render show_value(value.name, value.value, key)}
			{:else}
				<div class="row">
					<button
						onclick={() => on_selected([prev_key, key, value.name].filter(Boolean).join('.'))}
						class="click_event_wrapper"
					>
						{@render get_icon(value)}
						<p>{value.name}</p>

						{#if value.description}
							<p class="description">{value.description}</p>
						{/if}
					</button>
				</div>
			{/if}
		{/each}
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
	}

	.section {
		border-left: 1px solid red;
		padding-left: 0.25rem;
	}
</style>
