<script lang="ts">
	import { guild_state } from '$lib/stores/guild.svelte';
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

{#if guild_state.guild_id}
	<BasePicker {multiple} items={options} bind:value placeholder="Search Roles">
		{#snippet render_item(role)}
			<div class="option">
				{role.name}
			</div>
		{/snippet}
	</BasePicker>
{/if}

<style lang="scss">
</style>
