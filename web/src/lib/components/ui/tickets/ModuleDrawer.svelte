<script lang="ts">
	import {
		CATEGORY_NAMES,
		MODULE_OUTPUTS,
		ModuleCategory,
		type ModuleObject
	} from '@watcher/shared';
	import { fly } from 'svelte/transition';

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

	function handle_drag_start(e: DragEvent, module_type: string) {
		e.dataTransfer?.setData('optype', 'create');
		e.dataTransfer?.setData('module_type', module_type);
	}
</script>

<div class="drawer" transition:fly={{ duration: 300, x: -300 }}>
	{#each mapped.entries() as [cat_type, modules], idx}
		{@const cat_name = CATEGORY_NAMES[cat_type]}
		<b>{cat_name}</b>
		{#each modules as mod}
			<button
				class="stop_a11y_complaints"
				onclick={() => {
					on_click(mod.type);
				}}
			>
				<div
					role="region"
					draggable="true"
					ondragstart={(e) => handle_drag_start(e, mod.type)}
					class="module"
					style="--accent: {mod.accent_clr}"
				>
					{mod.name}
				</div>
			</button>
		{/each}
	{/each}
</div>

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: var(var(--clr), #121212);
	}

	.stop_a11y_complaints {
		all: unset;
		display: contents;
	}

	.module {
		cursor: grab;
		background-color: var(--accent);
		border-radius: 0.15rem;
		padding: 0.25rem;
	}

	.drawer {
		background-color: color-mix(in srgb, var(--clr) 95%, white);
		border: 2px solid rgba(255, 255, 255, 0.09);
		border-left: none;
		border-bottom: none;
		border-radius: 0 0.25rem 0 0;
		padding: 0.5rem;
	}
</style>
