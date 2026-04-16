<script lang="ts">
	import {  type Snippet } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { portal } from '$lib/client/attachments/portal';

	interface Props {
		parent_item: Snippet;
		child_item: Snippet;
		show_dropdown?: boolean;
	}

	let { parent_item, child_item, show_dropdown = $bindable(false) }: Props = $props();

	let wrapper_ref = $state<HTMLElement>();

	function toggle_fella() {
		show_dropdown = !show_dropdown;
		console.log('TOGGLED', show_dropdown);
	}
</script>

<div>
	{@render parent_item()}
	<button
		bind:this={wrapper_ref}
		class:dropped={show_dropdown}
		class="arrow"
		onclick={toggle_fella}><ChevronDown /></button
	>

	{#if show_dropdown && wrapper_ref}
		<div
			{@attach portal(wrapper_ref)}
			class="child_container"
			in:fly={{ duration: 200, opacity: 0, y: -8 }}
			out:fly={{ duration: 200, opacity: 0, y: -8 }}
		>
			{@render child_item()}
		</div>
	{/if}
</div>

<style lang="scss">
	@use '../../style/colours.scss';
	div {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.child_container {
		@extend .bg-background-700;
		z-index: 1337;
		min-width: 15em;
		border-radius: 0.5rem;
		position: absolute;
		box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;
	}

	.arrow {
		cursor: pointer;
		transition: 0.3s;
		background-color: transparent;
		border: none;
		color: inherit;

		&.dropped {
			transform: rotateX(180deg);
		}
	}
</style>
