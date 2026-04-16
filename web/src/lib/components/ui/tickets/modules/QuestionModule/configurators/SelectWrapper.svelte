<script lang="ts">
	import type { Snippet } from 'svelte';
	import style from '$lib/style/pipeline.module.scss';
	import common from '$lib/style/common.module.scss';

	interface Props {
		data: { min_values: number; max_values: number };
		max_allowed_values?: number;
		children: Snippet;
	}

	const { data = $bindable(), max_allowed_values = 25, children }: Props = $props();
</script>

<div>
	{@render children()}

	<div class={[common.row, common.gap_medium, 'minmax']}>
		<div class={[common.row, common.gap_medium]}>
			<p>Min</p>
			<input
				class={style.number}
				type="number"
				bind:value={data.min_values}
				min="0"
				max={max_allowed_values}
			/>
		</div>

		<div class={[common.row, common.gap_medium]}>
			<p>Max</p>
			<input
				class={style.number}
				type="number"
				bind:value={data.max_values}
				min="0"
				max={max_allowed_values}
			/>
		</div>
	</div>
</div>

<style lang="scss">
	.minmax {
		margin-top: 0.5rem;
	}
</style>
