<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import btn_style from '$lib/style/button.module.scss';
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	interface Props {
		items: T[];
		render_item: Snippet<[T]>;
		inline?: boolean;
		initial_items?: number;
	}

	const { items, render_item, inline, initial_items = 1 }: Props = $props();
	let expanded = $state(false);

	let visible_items = $derived(expanded ? items : items.slice(0, initial_items));
	const remaining_items = $derived(items.length - visible_items.length);
</script>

<div class="wrapper {inline ? 'inline' : ''}">
	<div class="items {inline ? 'inline' : ''}">
		{#each visible_items as item, i (item)}
			<span class="item_container" in:fade={{ duration: 200 }} animate:flip={{ duration: 300 }}>
				{@render render_item(item)}
			</span>
		{/each}
	</div>

	{#if !expanded && remaining_items > 0}
		<button
			onclick={() => (expanded = true)}
			class={[btn_style.button, btn_style.tetriary, 'show_more_btn']}
		>
			+{remaining_items}
		</button>
	{/if}
</div>

<style lang="scss">
	.wrapper {
		display: flex;
		gap: 0.5rem;

		&.inline {
			display: inline-flex;
		}
	}

	.items {
		display: flex;
		gap: 0.5rem;

		&.inline {
			flex-wrap: wrap;
		}
	}

	.item_container {
		width: max-content;
	}

	.show_more_btn {
		border-radius: 50%;
		aspect-ratio: 1/1;
		padding: 0.25rem;
	}
</style>
