<script lang="ts">
	import type { Pipeline, PipelineModule, TypedPipelineModule } from '@watcher/shared';
	import { MODULE_COMPONENTS } from './modules/module_registry';
	import type { Component } from 'svelte';
	import { use_pipeline } from '$lib/stores/pipeline.svelte';
	import { CircleMinus, CirclePlus } from '@lucide/svelte';
	import ModuleDrawer from './ModuleDrawer.svelte';

	const pipe_state = use_pipeline();

	function get_module_component(type: PipelineModule['type']) {
		return MODULE_COMPONENTS[type] as Component<{ module: TypedPipelineModule<typeof type> }>;
	}

	let show_module_drawer = $state(false);
</script>

<div class="pipeline">
	<div class="items">
		{#each pipe_state.modules as mod, index (mod.uid)}
			{@const Component = get_module_component(pipe_state.modules[index].type)}
			<Component bind:module={pipe_state.modules[index]} />
		{/each}
	</div>

	<div class="drawer">
		{#if show_module_drawer}
			<ModuleDrawer />
		{/if}
		<button onclick={() => (show_module_drawer = !show_module_drawer)} class="drawer_btn">
			{#if show_module_drawer}
				<CircleMinus size={24} />
			{:else}
				<CirclePlus size={24} />
			{/if}
		</button>
	</div>
</div>

<style lang="scss">
	.pipeline {
		background-color: #121212;
		padding: 1rem;

		--grid_clr: rgba(255, 255, 255, 0.05);
		background-image:
			linear-gradient(var(--grid_clr) 0.1em, transparent 0.1em),
			linear-gradient(90deg, var(--grid_clr) 0.1em, transparent 0.1em);
		background-size: 3em 3em;

		min-height: 50vh;
		position: relative;
	}

	.drawer {
		position: absolute;
		display: flex;
		bottom: 0;
		left: 0;
	}

	.drawer_btn {
		margin: 1rem;
		background-color: transparent;
		border: none;
		color: var(--primary-900);
		cursor: pointer;
	}

	.items {
		gap: 1rem;
		display: flex;
		flex-direction: column;
	}
</style>
