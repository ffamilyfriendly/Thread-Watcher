<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		children,
		title,
		description,
		contained
	}: { children: Snippet; title: string; description?: string | Snippet; contained?: boolean } =
		$props();
</script>

<div class="explainer" class:contained>
	<h2>{title}</h2>

	{#if typeof description === 'string'}
		<p>{description}</p>
	{:else if typeof description === 'function'}
		{@render description()}
	{/if}

	{@render children()}
</div>

<style lang="scss">
	.explainer {
		margin-bottom: 1rem;

		h2 {
			font-weight: 100;
			font-size: 1rem;
		}
		p {
			opacity: 0.7;
			margin-bottom: 0.5rem;
		}

		.contained {
			max-width: 60ch;
		}
	}
</style>
