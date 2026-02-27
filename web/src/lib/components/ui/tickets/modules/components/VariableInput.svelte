<script lang="ts">
	import { Variable } from '@lucide/svelte';
	import style from '$lib/style/pipeline.module.scss';
	import VariableSelector from './VariableSelector.svelte';

	interface Props {
		value?: string | null;
		module_uid?: string;
	}

	let { value = $bindable(), module_uid }: Props = $props();
	let show_selector = $state(false);

	function handle_selected(str: string) {
		value = `{{${str}}}`;
		show_selector = false;
	}
</script>

<div class={['container', style.text_input]}>
	<button onclick={() => (show_selector = !show_selector)}>
		<Variable />
	</button>
	<input bind:value />
</div>

{#if show_selector}
	<VariableSelector
		bind:show_this={show_selector}
		before_uid={module_uid}
		on_selected={handle_selected}
	/>
{/if}

<style lang="scss">
	.container {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		input,
		button {
			background-color: transparent;
			color: inherit;
			border: none;
		}

		input {
			flex-grow: 1;
		}

		button {
			font-size: smaller;
			color: var(--primary-900);
			cursor: pointer;
		}
	}
</style>
