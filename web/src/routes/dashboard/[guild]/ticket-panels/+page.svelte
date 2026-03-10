<script lang="ts">
	import type { PageProps } from './$types';
	import btn from '$lib/style/button.module.scss';

	const { data, params }: PageProps = $props();

	function str_to_vibrant_clr(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}

		const hue = Math.abs(hash) % 360;

		const sat = 80;
		const light = 65;

		return `hsl(${hue}, ${sat}%, ${light}%)`;
	}
</script>

<h1>Ticket Panels</h1>
{#each data.panels as panel}
	<div class="panel" style="--panel_clr: {str_to_vibrant_clr(panel.panel_id)}">
		<p>{panel.name ?? 'Panel Name'}</p>
		<p>{panel.description ?? 'Panel Description'}</p>
		<a href="./ticket-panels/{panel.panel_id}">edit</a>
	</div>
{/each}
<button class={[btn.button, btn.primary]}>New</button>

<style lang="scss">
	.panel {
		background-color: color-mix(in srgb, var(--panel_clr) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--panel_clr) 20%, transparent);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}
</style>
