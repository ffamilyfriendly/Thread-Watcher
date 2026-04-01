<script lang="ts">
	import { portal } from '$lib/client/attachments/portal';
	import { tooltip } from '$lib/client/attachments/tooltip';
	import { get_contrast_colour, str_to_vibrant_clr } from '$lib/client/colour';
	import {
		ArrowDown,
		ArrowUp,
		Grip,
	} from '@lucide/svelte';
	import {
		CATEGORY_NAMES,
		MODULE_OUTPUTS,
		ModuleCategory,
		type ModuleObject
	} from '@watcher/shared';
	import { slide } from 'svelte/transition';

	interface Props {
		on_click: (module_type: string) => void;
	}

	const { on_click }: Props = $props();

	type ModuleWithType = ModuleObject & { type: string };
	const mapped = $state<Map<ModuleCategory, ModuleWithType[]>>(new Map());

	Object.entries(MODULE_OUTPUTS).forEach(([type, mod]) => {
		if (mod.is_meta_module) return;
		const mod_with_type = mod as ModuleWithType;
		mod_with_type.category = mod.category ?? ModuleCategory.UNASSIGNED;
		mod_with_type.type = type;

		const arr = mapped.get(mod_with_type.category) ?? [];
		arr.push(mod_with_type);
		mapped.set(mod_with_type.category, arr);
	});


	function create_ghost_pill(mod: ModuleWithType): HTMLDivElement {
		const elem = document.createElement('div');
		const accent_colour = str_to_vibrant_clr(mod.type)
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

	function handle_drag_start(e: DragEvent, mod: ModuleWithType) {
		e.dataTransfer?.setData('optype', 'create');
		e.dataTransfer?.setData('module_type', mod.type);

		const ghost_element = create_ghost_pill(mod);

		e.dataTransfer?.setDragImage(
			ghost_element,
			ghost_element.clientWidth / 2,
			ghost_element.clientHeight / 2
		);
	}

	let show_module_drawer = $state(false);
	let ref_container = $state<HTMLElement>()
</script>

{#snippet module(mod: ModuleWithType)}
{@const accent_colour = str_to_vibrant_clr(mod.type)}
	<button
		class="stop_a11y_complaints"
		onclick={() => {
			on_click(mod.type);
		}}
	>
		<div
			{@attach tooltip({
				content: 'Click to insert or drag to position',
				followCursor: 'horizontal'
			})}
			role="region"
			draggable="true"
			ondragstart={(e) => handle_drag_start(e, mod)}
			class="module"
			style="--accent: {accent_colour}"
		>
			<p class="module_name" style:color={get_contrast_colour(accent_colour)}>{mod.name}</p>

			<div class="grip">
				<Grip />
			</div>
		</div>
	</button>
{/snippet}

<div bind:this={ref_container} class="drawer_container">
	<div class="btn_container">
		<button
	{@attach tooltip({
		content: show_module_drawer ? 'Hide Modules' : 'Show Modules',
		placement: 'right'
	})}
	class:active={show_module_drawer}
	onclick={() => (show_module_drawer = !show_module_drawer)}
	class="drawer_btn"
>
	{#if show_module_drawer}
		<ArrowDown size={24} />
	{:else}
		<ArrowUp size={24} />
	{/if}
</button>
	</div>

	{#if show_module_drawer}
	<div class="drawer" transition:slide={{ duration: 300 }}>
		{#each mapped.entries() as [cat_type, modules], idx}
			{@const cat_name = CATEGORY_NAMES[cat_type]}
			<div class="section">
				<b>{cat_name}</b>
				<div class="list">
					{#each modules as mod}
						{@render module(mod)}
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
</div>

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: var(var(--clr), #121212);
	}

	.drawer_btn {
		background-color: color-mix(in srgb, var(--clr) 95%, white);
		border: 2px solid rgba(255, 255, 255, 0.09);
		margin: 1rem;
		padding: 0.5rem;
		border-radius: 0.15rem;
		color: white;
		cursor: pointer;
		transition: 0.2s ease-in-out;
		opacity: 0.2;

		&:hover,
		&.active {
			opacity: 1;
		}
	}

	.module_name {
		color: black;
	}

	.drawer_container {
		position: absolute;
		bottom: 0;
		left: 0;
	}

	.stop_a11y_complaints {
		all: unset;
		display: contents;
	}

	.module {
		cursor: pointer;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--accent);
		border-radius: 0.15rem;
		padding: 0.25rem;

		.grip {
			display: contents;
			cursor: grab;
		}
	}

	.drawer {
		background-color: color-mix(in srgb, var(--clr) 80%, transparent);
		backdrop-filter: blur(5px);
		border: 2px solid rgba(255, 255, 255, 0.09);
		border-left: none;
		border-bottom: none;
		border-radius: 0 0.25rem 0 0;
		padding: 0.5rem;
		width: 100%;

		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.section {
		.list {
			padding: 0.5rem 0.25rem;
			background-color: color-mix(in srgb, var(--clr) 97%, white);
			border-radius: 0.15rem;
		}
	}
</style>
