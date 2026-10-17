<script lang="ts">
	import {
		ZTicketPanelMeta,
		type TicketPanelMetaObj,
		type TypedPipelineModule
	} from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import Explainer from '../../Explainer.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import z from 'zod';
	import { fetch_as_json } from '$lib/client/fetch';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import BasePicker from '../../settings/BasePicker.svelte';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import { Timer } from '@lucide/svelte';

	let panels = $state<TicketPanelMetaObj[]>();
	let is_loading = $state(false);

	interface Props {
		module: TypedPipelineModule<'PORTAL'>;
	}
	let { module = $bindable() }: Props = $props();

	const gs = use_guild_state();
	const ps = use_pipeline();

	$effect(() => {
		if (panels || !gs.is_ready) return;

		is_loading = true;
		fetch_as_json(`/api/${gs.guild_id_throws}/panels`, undefined, z.array(ZTicketPanelMeta)).then(
			(r) => {
				is_loading = false;
				if (r.isOk()) {
					panels = r.value;
				} else add_toast_from_error(r.error);
			}
		);
	});

	const panels_listing = $derived(
		panels
			?.map((i) => ({
				id: i.panel_id,
				name: i.name ?? i.panel_id,
				description: i.description ?? 'this panel has no description :('
			}))
			.filter((panel) => panel.id != ps.panel.panel_id)
	);
</script>

<BaseModule title="Portal" bind:module>
	{#snippet description()}
		<p>
			Stops this flow from executing and starts executing another flow seemlessly with already
			captured context retained.
		</p>
	{/snippet}

	<Explainer title="Destination">
		{#snippet description()}
			<p>Pick the panel you want to execute! Do note that existing context will remain.</p>
		{/snippet}

		{#if panels_listing}
			<BasePicker
				bind:value={module.panel_id}
				placeholder="cuh"
				allow_remove={false}
				items={panels_listing}
			>
				{#snippet render_item(x)}
					<p class="panel_list_item">
						<span>{x.name}</span>
						<span class="description">{x.description}</span>
					</p>
				{/snippet}
				{#snippet render_selected_item(x)}
					<p>{x.name}</p>
				{/snippet}
			</BasePicker>
		{:else}
			<div class="loader">
				<Timer size=".9rem" /> Loading panels...
			</div>
		{/if}
	</Explainer>
</BaseModule>

<style lang="scss">
	.panel_list_item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;

		.description {
			font-style: italic;
			opacity: 0.7;
			max-width: 30ch;
		}
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(100px, 50%));
	}

	.ai_input {
		font-size: smaller;
	}

	.loader {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
</style>
