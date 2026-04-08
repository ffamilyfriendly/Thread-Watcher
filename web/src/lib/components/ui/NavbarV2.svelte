<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		is_expanded: boolean;
		children: Snippet;
		direction?: 'left' | 'right';
		overlay?: boolean;
		width?: string;
	}
	let { is_expanded = $bindable(), children, direction = 'left', overlay, width }: Props = $props();

	let viewport_width = $state(0);

	const x_fly_anim = $derived(direction === 'left' ? -8 : 8);
	let aside_element = $state<HTMLElement>();
</script>

<svelte:window bind:innerWidth={viewport_width} />

{#if is_expanded}
	<aside
		style:width
		bind:this={aside_element}
		class:overlay
		class:right={direction === 'right'}
		in:fly={{ duration: 200, x: x_fly_anim, opacity: 0 }}
		out:fly={{ duration: 200, x: x_fly_anim, opacity: 0 }}
	>
		<div class="nav_items">
			{@render children()}
		</div>
	</aside>
{/if}

{#if overlay && is_expanded}
	<div class="backdrop" onclick={() => (is_expanded = false)} role="presentation"></div>
{/if}

<style lang="scss">
	aside {
		background-color: var(--background-600);
		border-right: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
		align-self: stretch;
		width: 100%;
		position: relative;

		&.overlay {
			position: fixed;
			top: 0;
			left: 0;
			height: 100vh;
			width: min(80vw, 300px);
			z-index: 1000;
		}

		&.right {
			left: unset;
			right: 0 !important;
			border-right: unset;
			border-left: 1px solid color-mix(in srgb, #121212 90%, white);
		}

		.nav_items {
			top: 0;
			padding: 1rem;
			position: sticky;
		}
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}
</style>
