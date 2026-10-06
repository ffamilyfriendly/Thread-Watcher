<script lang="ts">
	import { fetch_as_json } from '$lib/client/fetch';
	import Button from '$lib/components/ui/Button.svelte';
	import Explainer from '$lib/components/ui/Explainer.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import { CAN_HOLD_MESSAGES } from '$lib/types/discord';
	import { Rocket } from '@lucide/svelte';
	import { MODULE_OUTPUTS, ModuleCategory } from '@watcher/shared';
	import z from 'zod';

	const pipeline_state = use_pipeline();
	const guild_state = use_guild_state();
	let deploy_to_channel = $state<string>(
		pipeline_state.panel.discord_message_channel_id ?? pipeline_state.panel.initial_channel_id
	);
	let panel_is_deployed = $state(!!pipeline_state.panel.discord_message_id);

	const unsaved_changes = $derived(pipeline_state.is_dirty());

	const flow_has_exitpoint = $derived.by(() => {
		return !!pipeline_state.modules.find(
			(mod) => MODULE_OUTPUTS[mod.type].category === ModuleCategory.RESOLVERS
		);
	});

	const panel_is_legal = $derived(pipeline_state.is_panel_state_legal());

	const can_be_deployed = $derived(
		flow_has_exitpoint && !unsaved_changes && !!deploy_to_channel && panel_is_legal.legal
	);

	async function deploy_panel_to_channel() {
		const res = await fetch_as_json(
			`/api/panel/${pipeline_state.panel.panel_id}/send_message`,
			{
				method: 'POST',
				body: JSON.stringify({
					channel_id: deploy_to_channel,
					guild_id: guild_state.guild_id!,
					panel_id: pipeline_state.panel.panel_id
				})
			},
			z.object({ message_id: z.string() })
		);

		if (res.isErr()) return add_toast_from_error(res.error);

		return add_toast({ message: 'HI :D', type: 'success' });
	}
</script>

<main>
	<div class="deploy">
		<div class="card">
			<ul class="checklist">
				<li>
					{#if flow_has_exitpoint}
						<span class="diode green"></span>
						<p>Flow has a valid exit point!</p>
					{:else}
						<span class="diode red"></span>
						<p>Flow does not have a valid exit point!</p>
					{/if}
				</li>
				<li>
					{#if unsaved_changes}
						<span class="diode red"></span>
						<p>You've unsaved changes. Please save or undo changes before deploying</p>
					{:else}
						<span class="diode green"></span>
						<p>No unsaved changes.</p>
					{/if}
				</li>
				<li>
					{#if panel_is_legal.legal}
						<span class="diode green"></span>
						<p>Panel is configured properly!</p>
					{:else}
						<span class="diode red"></span>
						<p>{panel_is_legal.why}</p>
					{/if}
				</li>
				<li>
					{#if panel_is_deployed}
						<span class="diode green"></span>
						<p>Your panel is deployed!</p>
					{:else}
						<span class="diode gray"></span>
						<p>Panel is not yet deployed.</p>
					{/if}
				</li>
			</ul>
		</div>

		<div>
			imagine some box here if the ticket is alr deployed that idk like says if the message is still
			up or an error if deleted idk
		</div>

		<div class="card">
			<Explainer title="Deployment Target">
				{#snippet description()}
					<p>Select a target channel</p>
				{/snippet}
				<ChannelPicker
					bind:value={deploy_to_channel}
					only_with_types={CAN_HOLD_MESSAGES}
					channels={guild_state.channels}
					guild_id={guild_state.guild_id!}
				/>
			</Explainer>

			<Button disabled={!can_be_deployed} load_with={deploy_panel_to_channel}
				><Rocket /> Deploy</Button
			>
		</div>
	</div>

	<div class="stats">
		Imageine we have some stats here (tickets open rn, tickets made thru this ticket panel total,
		idk other stuff gng)
	</div>
</main>

<style lang="scss">
	main {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;

		.deploy {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}
	}

	.card {
		background-color: var(--background-600);
		padding: 1rem;
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
	}

	.diode {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		flex-shrink: 0;

		&.green {
			background-color: var(--success-500, #22c55e);
			box-shadow: 0 0 6px color-mix(in srgb, var(--success-500, #22c55e) 60%, transparent);
		}

		&.red {
			background-color: var(--error-500, #ef4444);
			box-shadow: 0 0 6px color-mix(in srgb, var(--error-500, #ef4444) 60%, transparent);
		}

		&.gray {
			--grayyyy: rgb(74, 74, 74);
			background-color: var(--grayyyy, #ef4444);
			box-shadow: 0 0 6px color-mix(in srgb, var(--grayyyy, #ef4444) 60%, transparent);
		}
	}

	.checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;

		li {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.5rem 0.75rem;
			background-color: color-mix(in srgb, var(--background-500) 95%, white);
			border: 1px solid color-mix(in srgb, var(--background-500) 85%, white);
			border-radius: 0.25rem;

			p {
				margin: 0;
				font-size: 0.9rem;
			}
		}
	}

	.stats {
		max-width: 55ch;
	}
</style>
