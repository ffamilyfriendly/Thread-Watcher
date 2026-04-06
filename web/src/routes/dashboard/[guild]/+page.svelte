<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetch_as_json } from '$lib/client/fetch.js';
	import { get_pwetty_relative_time } from '$lib/client/time_util.js';
	import AuditLog from '$lib/components/ui/Audit/AuditLog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import UserLoader from '$lib/components/ui/discord/user/UserLoader.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import SettingBox from '$lib/components/ui/settings/SettingBox.svelte';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { CheckSquare, CheckSquare2, ExternalLink, EyeIcon, SailboatIcon, SpoolIcon, Square, SquareCheck, UserSquare2 } from '@lucide/svelte';
	import z from 'zod';

	const { data } = $props();
	const guild = data.guild;

	let bot_master_role = $state<string | null>();

	async function update_bot_master_role() {
		const save_res = await fetch_as_json(
			'/api/update_settings',
			{
				body: JSON.stringify({
					updated_settings: { BOT_MASTER_ROLE: bot_master_role },
					guild_id: data.guild_id
				}),
				method: 'POST'
			},
			z.object({ code: z.number(), message: z.string() })
		);

		if (save_res.isErr()) return add_toast_from_error(save_res.error);

		await invalidateAll();
		show_bot_master_modal = false
		add_toast({
			label: 'Good Job!',
			message: 'Added Bot Master',
			timeout: 5000,
			type: 'success'
		});
	}

	let show_bot_master_modal = $state(false)
</script>

<h1>Welcome, <span class="username">{data.session?.user.name}</span></h1>
<div class="card_container">
	<div class="card">
		<SpoolIcon />
		<div>
			<span>{guild.threads_watched}</span>
			<small>Threads Watched</small>
		</div>
	</div>
	<div class="card">
		<EyeIcon />
		<div>
			<span>{guild.monitors_active}</span>
			<small>Active Monitors</small>
		</div>
	</div>
	<div class="card">
		<SailboatIcon />
		<div>
			<span>{guild.owned_by_shard}</span>
			<small>Your Shard</small>
		</div>
	</div>
</div>

<h2>Get Started!</h2>
<ul class="todo_list">
	<li class="task">
		{#if guild.guild_settings.BOT_MASTER_ROLE}
			<SquareCheck />
		{:else}
			<Square />
		{/if}
		
		<div>
			<p>Set a <b>Bot Master</b> role</p>
			<small>Let's get your staff involved!</small>
		</div>
		<Button disabled={!!guild.guild_settings.BOT_MASTER_ROLE} variant="tetriary" on_click={() => show_bot_master_modal = true}>Go</Button>
	</li>
	<li class="task">
		{#if data.monitors_count >= 1}
			<SquareCheck />
		{:else}
			<Square />
		{/if}
		<div>
			<p>Create a monitor</p>
			<small>Make Thread-Worker work for you!</small>
		</div>
		<Button disabled={data.monitors_count >= 1} variant="tetriary" href="/dashboard/{guild.guild.id}/monitors">Go</Button>
	</li>
	<li class="task">
		{#if data.ticket_panels_count >= 1}
			<SquareCheck />
		{:else}
			<Square />
		{/if}
		<div>
			<p>Create a ticket panel</p>
			<small>get the tickets flowing</small>
		</div>
		<Button disabled={ data.ticket_panels_count >= 1} variant="tetriary" href="/dashboard/{guild.guild.id}/ticket-panels/create-new">Go</Button>
	</li>
</ul>

{#if show_bot_master_modal}
	<Modal title="Assign Bot Master" bind:set_open={show_bot_master_modal}>
		<SettingBox
			name="Bot Master"
			description="Select the role that can access the bot dashboard."
			disclaimer="Any role with Administrator will be considered a Bot Master"
		>
			<RolePicker bind:value={bot_master_role} roles={data.roles} />
		</SettingBox>

		{#snippet buttons()}
			<Button load_with={update_bot_master_role} disabled={!bot_master_role} variant="primary">Set</Button>
		{/snippet}
	</Modal>
{/if}

{#if data.relevant_tickets.length > 0}
<h3>Relevant Tickets</h3>
<div class="tickets">
	{#each data.relevant_tickets as t}
		<div class="ticket">
			<b>{t.name}</b>
			<UserLoader user_id={t.owner} />

			<div class="badges">
				<span class="badge time">{get_pwetty_relative_time(t.created_at)}</span>
				{#if t.claimed_by_user_id === data.session?.user.id} <span class="badge assigned">Assigned To You</span> {/if}
				{#if t.owner === data.session?.user.id} <span class="badge yours">Is Yours</span> {/if}
			</div>
		</div>
	{/each}
</div>
{/if}

{#if data.recent_audits.length > 0}
<div class="audits">
	{#each data.recent_audits as a}
		<div class="log">
			{a.data.audit_type}
		</div>
	{/each}
</div>
{/if}

<style lang="scss">

	.tickets {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: .5rem;

		.ticket {
			background-color: var(--background-600);
			border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
			border-radius: .25rem;
			display: flex;
			flex-direction: column;
			padding: .5rem 1rem;

			.badges {
				display: flex;
				align-items: center;
				gap: .25rem;
				margin-top: .25rem;

				.badge {
					padding: .1rem .5rem;
					border-radius: 1rem;
					font-size: smaller;
					color: color-mix(in srgb, white 80%, transparent);
				}

				.time {
					border: 1px solid var(--primary-500);
				}

				.yours {
					border: 1px solid var(--error-500);
				}
			}
		}
	}

	.todo_list {
		list-style: none;
		width: fit-content;

		li {
			display: flex;
			align-items: center;
			gap: .5rem;
		}

		.task div {
			margin-right: auto;
		}
	}

	.username {
		color: var(--primary-900);
	}

	.card {
		display: flex;
		gap: 1rem;
		flex-grow: 1;

		border-radius: 0.5rem;
		outline: 1px solid rgba(128, 128, 128, 0.3);
		padding: 1.5rem;
		padding-top: 1rem;
		padding-bottom: 1rem;

		& div {
			display: flex;
			flex-direction: column;
		}

		& small {
			opacity: 0.5;
		}

		@media (max-width: 500px) {
			flex-direction: column;
		}
	}

	.card_container {
		display: flex;
		justify-content: space-evenly;
		padding-top: 2%;
		padding-bottom: 2%;
		gap: max(2%, 5px);
	}
</style>
