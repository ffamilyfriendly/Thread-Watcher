<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tabs: { label: string; content: Snippet }[];
		classname?: string;
		on_change?: (new_page: number) => void;
		inverted?: boolean;
	}

	const { tabs, classname, on_change, inverted }: Props = $props();
	let selected_page = $state(0);

	const headings = $derived(tabs.map((t) => t.label));
	const content = $derived(tabs[selected_page].content);

	function change_page(page: number) {
		if (on_change) on_change(page);
		selected_page = page;
	}
</script>

<div class:inverted class={['tabbed', classname]}>
	<div class="header">
		{#each headings as heading, idx (idx)}
			<button class:active={idx === selected_page} onclick={() => change_page(idx)}>
				{heading}
			</button>
		{/each}
	</div>

	{#key selected_page}
		<div class="content">
			{@render content()}
		</div>
	{/key}
</div>

<style lang="scss">
	.tabbed {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		&.inverted {
			flex-direction: column-reverse;
		}

		.header {
			opacity: 0.25;
			transition: opacity 0.2s;
			--base_clr: var(--primary-700);
			color: color-mix(in srgb, var(--base_clr) 15%, white);
			border: 1px solid var(--base_clr);
			display: flex;
			width: fit-content;
			border-radius: 0.25rem;
			overflow: hidden;

			&:hover {
				opacity: 1;
			}

			button {
				transition: 0.2s;
				background-color: color-mix(in srgb, var(--base_clr) 5%, transparent);
				font-size: 1rem;
				padding: 0.2rem 0.5rem;
				cursor: pointer;
				color: inherit;
				border: none;

				&.active {
					background-color: color-mix(in srgb, var(--base_clr) 50%, transparent);
				}

				&:not(.active):hover {
					background-color: color-mix(in srgb, var(--base_clr) 20%, transparent);
				}
			}
		}

		.content {
			margin-top: 0.5rem;
		}
	}
</style>
