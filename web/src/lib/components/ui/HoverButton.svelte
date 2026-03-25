<script lang="ts">
	import { portal } from '$lib/client/attachments/portal';
	import { offset, shift } from '@floating-ui/dom';
	import type { Snippet } from 'svelte';

	interface Props {
		target?: HTMLElement;
		children: Snippet;
		colour?: string;
	}
	const { target, children, colour = 'var(--background-500)' }: Props = $props();

	let is_visible = $state(false);
	let hide_timeout: ReturnType<typeof setTimeout> | null = null;

	function show() {
		if (hide_timeout) {
			clearTimeout(hide_timeout);
			hide_timeout = null;
		}
		is_visible = true;
	}

	function hide() {
		hide_timeout = setTimeout(() => {
			is_visible = false;
		}, 100);
	}

	$effect(() => {
		if (!target) return;
		target.addEventListener('mouseenter', show);
		target.addEventListener('mouseleave', hide);
		return () => {
			target.removeEventListener('mouseenter', show);
			target.removeEventListener('mouseleave', hide);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if target}
	<div
		style="--clr: {colour}"
		class="buttons"
		class:visible={is_visible}
		onmouseenter={show}
		onmouseleave={hide}
		{@attach portal(target, {
			placement: 'top-end',
			middleware: [shift({ padding: 5 }), offset(-10)]
		})}
	>
		{@render children()}
	</div>
{/if}

<style lang="scss">
	.buttons {
		background-color: var(--clr);
		outline: 1px solid color-mix(in srgb, var(--clr) 90%, white);
		border-radius: 0.25rem;
		padding: 0.5rem 0.25rem;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.15s;

		&.visible {
			opacity: 1;
			pointer-events: auto;
		}
	}
</style>
