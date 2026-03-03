<script lang="ts">
	import type { DiscordTag } from '$lib/types/internal_api';
	import Emoji from '../discord/Emoji.svelte';
	import BasePicker from './BasePicker.svelte';

	interface Props {
		options: DiscordTag[];
		value?: string | string[] | null;
		multiple?: boolean;
		disabled?: boolean;
	}

	let { options, value = $bindable(), multiple = false, disabled }: Props = $props();
</script>

<BasePicker {disabled} {multiple} items={options} bind:value placeholder="Search Roles">
	{#snippet render_item(tag)}
		<div class="option">
			{#if tag.emoji}
				<Emoji id={tag.emoji.id} name={tag.emoji.name} />
			{/if}
			{tag.name}
		</div>
	{/snippet}
</BasePicker>


<style lang="scss">
	.option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
