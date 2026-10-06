<script lang="ts">
	import { tooltip } from '$lib/client/attachments/tooltip';
	import { get_contrast_colour, str_to_vibrant_clr } from '$lib/client/colour';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import { Bell, Grip, Sparkle, Vault, type IconProps } from '@lucide/svelte';
	import {
		CATEGORY_NAMES,
		MODULE_OUTPUTS,
		ModuleCategory,
		type ModuleObject,
		type PipelineModule
	} from '@watcher/shared';
	import Modal from '../Modal.svelte';
	import type { Component } from 'svelte';
	import { get_module_icon } from './modules/module_registry';

	const MODULE_CATEGORY_ICONS: Record<ModuleCategory, Component<IconProps, {}, ''> | null> = {
		[ModuleCategory.AI]: Sparkle,
		[ModuleCategory.ASSIGNMENT]: Vault,
		[ModuleCategory.INPUTS]: Bell,
		[ModuleCategory.RESOLVERS]: null,
		[ModuleCategory.UNASSIGNED]: null
	};

	interface Props {
		on_click: (module_type: string) => void;
	}

	let panel_state = use_pipeline();

	const { on_click }: Props = $props();

	const mapped = $state<Map<ModuleCategory, ModuleObject[]>>(new Map());

	Object.entries(MODULE_OUTPUTS).forEach(([type, mod]) => {
		if (mod.is_meta_module) return;

		const module_category_w_fallback = mod.category ?? ModuleCategory.UNASSIGNED;

		const arr = mapped.get(module_category_w_fallback) ?? [];
		arr.push(mod);
		mapped.set(module_category_w_fallback, arr);
	});

	function create_ghost_pill(mod: ModuleObject): HTMLDivElement {
		const elem = document.createElement('div');
		const accent_colour = str_to_vibrant_clr(mod.type);
		elem.innerText = mod.name;
		elem.style.backgroundColor = accent_colour;
		elem.style.height = '25px';
		elem.style.width = 'fit-content';
		elem.style.padding = '.1rem .25rem';
		elem.style.borderRadius = '.25rem';
		elem.classList.add('atkinson-300');
		elem.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
		elem.style.border = '1px solid rgba(255,255,255,0.2)';

		document.body.appendChild(elem);

		setTimeout(() => {
			document.body.removeChild(elem);
		}, 0);

		return elem;
	}

	function handle_drag_start(e: DragEvent, mod: ModuleObject) {
		e.dataTransfer?.setData('optype', 'create');
		e.dataTransfer?.setData('module_type', mod.type);

		const ghost_element = create_ghost_pill(mod);

		e.dataTransfer?.setDragImage(
			ghost_element,
			ghost_element.clientWidth / 2,
			ghost_element.clientHeight / 2
		);
	}

	function on_module_click_wrapper(mod_type: string) {
		panel_state.module_picker_open = false;
		on_click(mod_type);
	}
</script>

{#snippet module(mod: ModuleObject)}
	{@const accent_colour = str_to_vibrant_clr(mod.type)}
	{@const ModuleIcon = get_module_icon(mod.type)}
	<button
		class="stop_a11y_complaints"
		onclick={() => {
			on_module_click_wrapper(mod.type);
		}}
	>
		<div
			{@attach tooltip({
				content: mod.description ?? mod.name,
				followCursor: 'horizontal'
			})}
			role="region"
			draggable="true"
			ondragstart={(e) => handle_drag_start(e, mod)}
			class="module"
		>
			<span class="module_icon" style="--box: {accent_colour}">
				<ModuleIcon size="1.2rem" color="black" />
			</span>
			{mod.name}
		</div>
	</button>
{/snippet}

{#if panel_state.module_picker_open}
	<Modal title="Insert New Module" bind:set_open={panel_state.module_picker_open}>
		<div class="category_lists">
			{#each mapped.entries() as [cat_type, modules], idx}
				{@const cat_name = CATEGORY_NAMES[cat_type]}
				{@const Icon = MODULE_CATEGORY_ICONS[cat_type]}

				<div class="section">
					<div class="header">
						{#if Icon}
							<Icon size={16} />
						{/if}
						<b>{cat_name}</b>
					</div>

					<div class="list">
						{#each modules as mod}
							{@render module(mod)}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</Modal>
{/if}

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: var(var(--clr), #121212);
	}

	.header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stop_a11y_complaints {
		all: unset;
		display: contents;
	}

	.module {
		cursor: pointer;
		position: relative;
		border-radius: 0.15rem;
		display: flex;
		align-items: center;
		color: inherit;
		transition: 0.3s;
		padding: 0.5rem;
		transform: translateX(-0.5rem);

		&:hover {
			background-color: color-mix(in srgb, var(--clr) 97%, white);
		}

		.module_icon {
			margin-right: 0.25rem;
			background-color: var(--box);
			border-radius: 0.25rem;
			padding: 0.15rem;
			height: 1.5rem;
			width: 1.5rem;
		}
	}

	.category_lists {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.section {
		.list {
			padding: 0.5rem 0rem;
		}
	}
</style>
