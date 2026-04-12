<script lang="ts">
	import NavbarUnauthed from '$lib/components/ui/NavbarUnauthed.svelte';

	let { children } = $props();
</script>

<NavbarUnauthed />
<article>
	{@render children()}
</article>

<style>
	article {
		padding: 0rem 1rem;
	}

	:root {
		--content-width: 1200px;
		--side-padding: clamp(1.5rem, 5vw, 4rem);
	}

	:global(section) {
		width: 100%;
		max-width: var(--content-width);
		margin-left: auto;
		margin-right: auto;
		padding-left: var(--side-padding);
		padding-right: var(--side-padding);
		margin-bottom: 1rem;
	}

	:global(h3) {
		margin-top: 0.5rem;
	}

	:global(h2) {
		margin-top: 1rem;
	}

	:global(p) {
		margin-bottom: 0.3rem;
	}
</style>
