<script lang="ts">
	import type { TypedPipelineModule } from '@watcher/shared';
	import { MODULE_COMPONENTS, type RenderableModuleTypes } from './modules/module_registry';
	import type { Component } from 'svelte';
	import { use_pipeline } from '$lib/stores/pipeline.svelte';
	import ModuleDrawer from './ModuleDrawer.svelte';
	import DropArea from './DropArea.svelte';
	import DefaultPipelines from './DefaultPipelines.svelte';

	const pipe_state = use_pipeline();

	function get_module_component(type: RenderableModuleTypes) {
		return MODULE_COMPONENTS[type] as Component<{ module: TypedPipelineModule<typeof type> }>;
	}

	function handle_reorder(idx: number, module_uid: string) {
		pipe_state.move_module(idx, module_uid);
	}

	function handle_create(idx: number, module_type_unchecked: string) {
		pipe_state.create_module_with_defaults(idx, module_type_unchecked);
		console.log('CREATED', module_type_unchecked);
	}

	const safe_modules = $derived(pipe_state.safe_modules());
</script>

<div class="pipeline">
	{#if safe_modules.length === 0}
		<DefaultPipelines />
	{/if}

	<div class="items">
		{#each safe_modules as mod, index (mod.uid)}
			{@const Component = get_module_component(mod.type)}

			<DropArea on_create_here={handle_create} on_move={handle_reorder} idx={index} />
			<Component bind:module={safe_modules[index]} />
		{/each}
		<DropArea
			on_create_here={handle_create}
			on_move={handle_reorder}
			idx={pipe_state.modules.length}
		/>
	</div>

	<ModuleDrawer
		on_click={(unchecked_module_type) => {
			handle_create(pipe_state.modules.length, unchecked_module_type);
		}}
	/>
</div>

<style lang="scss">
	.pipeline {
		background-color: #121212;

		--grid_clr: rgba(255, 255, 255, 0.05);
		background-image:
			linear-gradient(var(--grid_clr) 0.1em, transparent 0.1em),
			linear-gradient(90deg, var(--grid_clr) 0.1em, transparent 0.1em);
		background-size: 3em 3em;
		min-height: 350px;
		position: relative;
		display: flex;
	}

	.items {
		padding: 1rem;
		gap: 1rem;
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
