<script lang="ts">
	let { variable_name }: { variable_name: string } = $props();
</script>

<span class="variable">{variable_name}</span>

<style lang="scss">
	.variable {
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		outline: 1px solid var(--primary-500);
		padding: 0.1rem 0.5rem;
		border-radius: 1rem;
		height: 1rem;
	}
</style>
