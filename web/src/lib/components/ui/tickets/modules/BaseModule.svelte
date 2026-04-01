<script lang="ts">
	import { ChevronDown, ChevronUp, Trash2 } from '@lucide/svelte';
	import { MODULE_OUTPUTS, type PipelineModule } from '@watcher/shared';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import PermissionsSection from './components/PermissionsSection.svelte';
	import { use_pipeline } from '$lib/stores/pipeline.svelte';
	import common from '$lib/style/common.module.scss';
	import IDSelector from './components/IDSelector.svelte';
	import { str_to_vibrant_clr } from '$lib/client/colour';

	interface Props {
		module: PipelineModule;
		children: Snippet;
		title: string;
		description: Snippet;
	}

	let { module = $bindable(), children, title, description }: Props = $props();

	const pipeline = use_pipeline();

	const accent = $derived(str_to_vibrant_clr(module.type))

	function handle_drag_start(e: DragEvent) {
		e.dataTransfer?.setData('optype', 'move');
		e.dataTransfer?.setData('module_id', module.uid);
	}

	function handle_delete() {
		pipeline.delete_module(module.uid);
	}

	let expanded = $state(false);
</script>

<div
	role="region"
	draggable={!expanded}
	class:draggable={!expanded}
	ondragstart={handle_drag_start}
	class="wrapper"
>
	<div style="--accent: {accent}" class="module {expanded ? '' : 'hidden'}">
		{#if expanded}
			<div transition:slide={{ duration: 300 }} class="expansion_wrapper">
				<div class="head">
					<div class="meta">
						<h3 class="space-grotesk">{title}</h3>
						<p class="description jetbrains-mono-300">
							{@render description()}
						</p>
					</div>

					<PermissionsSection bind:module />
				</div>

				<div class="content">
					{@render children()}
				</div>

				<div class="footer">
					<IDSelector bind:id={module.id} />
				</div>
			</div>
		{:else}
			<div transition:slide={{ duration: 300 }}>
				<p class="space-grotesk">{title}</p>
				<small class="jetbrains-mono">{module.id}</small>
			</div>
		{/if}
	</div>

	<div class={[common.flex_col]}>
		<button class="expand" onclick={() => (expanded = !expanded)}>
			{#if expanded}
				<ChevronUp />
			{:else}
				<ChevronDown />
			{/if}
		</button>

		<button onclick={handle_delete} class="expand delete">
			<Trash2 />
		</button>
	</div>
</div>

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: #121212;
	}

	.description {
		font-size: smaller;
	}

	.draggable {
		cursor: move;
	}

	.wrapper {
		display: flex;
		width: 100%;
		gap: 1rem;
		align-items: start;

		&:hover {
			.delete {
				opacity: 1;

				&:hover {
					color: var(--error-700);
				}
			}
		}

		.delete {
			opacity: 0;
			color: var(--error-500);
		}
	}

	.expand {
		background-color: transparent;
		color: white;
		border: none;
		cursor: pointer;
	}

	.module {
		position: relative;
		flex-grow: 1;
		background-color: color-mix(in srgb, var(--clr) 95%, white);
		border-left: 3px solid var(--accent);
		outline: 2px solid rgba(255, 255, 255, 0.09);

		border-radius: 0.1rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

		&.hidden {
			padding: var(--padding);
			border-radius: 0.1rem;

			small {
				opacity: 0.4;
			}
		}

		.content {
			padding: var(--padding);
		}

		.footer {
			border-top: 1px solid color-mix(in srgb, var(--clr) 80%, white);
			background-color: color-mix(in srgb, var(--clr) 90%, white);
			padding: 0.5rem var(--padding);
		}

		.head {
			border-bottom: 1px solid color-mix(in srgb, var(--clr) 80%, white);
			background-color: color-mix(in srgb, var(--clr) 90%, white);
			padding: 0.5rem var(--padding);
			display: flex;
			gap: 1rem;
			justify-content: space-between;
			align-items: start;

			.meta {
				width: 50%;
				background-color: color-mix(in srgb, var(--clr) 95%, var(--accent));
				border: 2px solid color-mix(in srgb, var(--clr) 80%, var(--accent));
				padding: 0.5rem;

				p {
					opacity: 0.7;
				}
			}
		}
	}
</style>
