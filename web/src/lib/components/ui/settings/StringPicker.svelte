<script lang="ts">
	import BasePicker from './BasePicker.svelte';

	interface StringOption {
		name: string;
		id: string;
		description?: string;
	}

	interface Props {
		options: StringOption[];
		value?: string | string[] | null;
		multiple?: boolean;
	}

	let { options, value = $bindable(), multiple = false }: Props = $props();
</script>


<BasePicker {multiple} items={options} bind:value placeholder="Search Options">
	{#snippet render_item(role)}
		<div class="option">
			{role.name}
			{#if role.description}
				<span class="description">{role.description}</span>
			{/if}
		</div>
	{/snippet}
</BasePicker>


<style lang="scss">
	.option {
		display: flex;
		flex-direction: column;

		.description {
			opacity: .5;
		}
	}
</style>
