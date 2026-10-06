<script lang="ts">
	let { variable_name }: { variable_name: string } = $props();
</script>

<span class="variable"> {'{{'}{variable_name}{'}}'}</span>

<style lang="scss">
	.variable {
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		font-family: monospace;
		background-color: black;
	}
</style>
