<script lang="ts">
	interface Props {
		level: 'BASIC' | 'EXTENDED';
	}

	const { level }: Props = $props();
</script>

{#if level === 'EXTENDED'}
	hi
{:else if level === 'BASIC'}
	basic
{/if}
