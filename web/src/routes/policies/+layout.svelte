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
</style>
