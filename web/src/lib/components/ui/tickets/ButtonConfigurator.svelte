<script lang="ts">
	import type { ButtonStart } from '@watcher/shared';
	import EditableAttribute from './EditableAttribute.svelte';

	interface Props {
		value: ButtonStart;
	}

	const { value = $bindable() }: Props = $props();
</script>

<div class="discord_btn">
	<EditableAttribute bind:value={value.button_text}>
		{#snippet display(v)}
			{v}
		{/snippet}
	</EditableAttribute>
</div>

<style lang="scss">
	.discord_btn {
		--space-4: 4px;
		--space-12: 12px;
		background-color: #5865f2;
		height: 32px;
		min-height: 32px;
		min-width: 60px;
		width: max-content;
		border-radius: 0.25rem;
		padding: calc(var(--space-4) - 1px) calc(var(--space-12) - 1px);
	}
</style>
