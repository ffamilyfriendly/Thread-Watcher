<script lang="ts">
	let { children } = $props();
</script>

<article>
	{@render children()}
</article>

<style>
	article {
		padding: 0rem 1rem;
	}
</style>
