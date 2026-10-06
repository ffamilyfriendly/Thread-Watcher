<script lang="ts">
	import { ChevronDown, ChevronUp, Eye, EyeClosed, Info, Trash2 } from '@lucide/svelte';
	import { type PipelineModule } from '@watcher/shared';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import PermissionsSection from './components/PermissionsSection.svelte';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import common from '$lib/style/common.module.scss';
	import IDSelector from './components/IDSelector.svelte';
	import { get_contrast_colour, str_to_vibrant_clr } from '$lib/client/colour';
	import { get_module_icon } from './module_registry';
	import { s_tooltip, tooltip } from '$lib/client/attachments/tooltip';
	import Button from '../../Button.svelte';

	interface Props {
		module: PipelineModule;
		children: Snippet;
		title: string;
		description: Snippet;
	}

	let { module = $bindable(), children, title, description }: Props = $props();

	const pipeline = use_pipeline();

	function handle_drag_start(e: DragEvent) {
		e.dataTransfer?.setData('optype', 'move');
		e.dataTransfer?.setData('module_id', module.uid);
	}

	function handle_delete() {
		pipeline.delete_module(module.uid);
	}

	let expanded = $state(false);

	const ModuleIcon = get_module_icon(module.type);
	const accent = str_to_vibrant_clr(module.type);

	let tooltip_node = $state<HTMLElement>();
</script>

<div bind:this={tooltip_node} class="tooltip_template">
	{@render description()}
</div>

<div
	role="region"
	draggable={!expanded}
	class:draggable={!expanded}
	ondragstart={handle_drag_start}
	class="wrapper"
>
	<div style="--accent: {accent}" class="module {expanded ? '' : 'hidden'}">
		<div class="head">
			<span style="--accent: {accent}" class="icon_box">
				<ModuleIcon />
			</span>

			<span class="module_name">
				<Info
					opacity={0.5}
					size={'1.1rem'}
					{@attach tooltip({
						allowHTML: true,
						content: tooltip_node,
						interactive: true,
						appendTo: () => document.body
					})}
				/>
				{title}
			</span>

			<IDSelector bind:id={module.id} />

			<div class="buttons">
				<Button on_click={() => (expanded = !expanded)} variant="none">
					{#if expanded}
						<EyeClosed size={'1rem'} />
					{:else}
						<Eye size={'1rem'} />
					{/if}
				</Button>
				<Button
					variant="none"
					on_click={handle_delete}
					confirmation={{
						title: `Delete ${module.type}`,
						body: 'This cannot be undone.',
						proceed_btn_text: 'Delete Module',
						cancel_btn_text: 'Nevermind'
					}}><Trash2 size={16} color="var(--error-500)" /></Button
				>
			</div>
		</div>

		{#if expanded}
			<div transition:slide={{ duration: 300 }} class="expansion_wrapper">
				<div class="perms">
					<PermissionsSection bind:module />
				</div>

				<div class="line"></div>

				<div class="content">
					{@render children()}
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: #121212;
	}

	.buttons {
		margin: 0 1rem;
		background-color: color-mix(in srgb, var(--clr) 25%, transparent);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		gap: 0.5rem;
	}

	.draggable {
		cursor: move;
	}

	.wrapper {
		display: flex;
		width: 100%;
		gap: 1rem;
		align-items: start;
	}

	.module_name {
		font-size: 1.1rem;
	}

	.module {
		position: relative;
		background-color: color-mix(in srgb, var(--clr) 95%, white);
		border-left: 3px solid var(--accent);
		border: 2px solid rgba(255, 255, 255, 0.09);
		border-radius: 0.15rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		width: 100%;
		overflow: hidden;

		.head {
			display: grid;
			grid-template-columns: auto 1fr auto auto;
			background-color: color-mix(in srgb, var(--clr) 90%, white);
			align-items: center;
			.icon_box {
				padding: 0.5rem;
				background-color: var(--accent);
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100%;
				aspect-ratio: 1 / 1;
				margin-right: 1rem;
			}
		}

		.perms {
			padding: var(--padding);
		}

		&.hidden {
			border-radius: 0.2rem;
		}

		.content {
			padding: var(--padding);
		}
	}

	.expansion_wrapper {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		gap: 1rem;

		.line {
			width: 1px;
			background-color: rgba(255, 255, 255, 0.1);
		}

		.content {
			order: 0;
		}

		.line {
			order: 1;
		}

		.perms {
			order: 2;
		}

		@media screen and (max-width: 1200px) {
			display: flex;
			flex-direction: column-reverse;

			.line {
				width: 100%;
				height: 1px;
			}
		}
	}
</style>
