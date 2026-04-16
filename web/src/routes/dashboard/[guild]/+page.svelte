<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import { fetch_as_json } from '$lib/client/fetch.js';
	import { get_pwetty_relative_time } from '$lib/client/time_util.js';
	import AuditLog from '$lib/components/ui/Audit/AuditLog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import UserLoader from '$lib/components/ui/discord/user/UserLoader.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import SettingBox from '$lib/components/ui/settings/SettingBox.svelte';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import {
		Check,
		ExternalLink,
		EyeIcon,
		Ghost,
		LayoutPanelLeft,
		SpoolIcon,
		Square,
		SquareCheck
	} from '@lucide/svelte';
	import z from 'zod';
	import type { PageProps } from './$types';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { PUBLIC_PREMIUM_SKU_STORE_LINK } from '$env/static/public';

	const { data, params }: PageProps = $props();

	const gs = use_guild_state()

	const guild_id = $derived(params.guild);

	let bot_master_role = $state<string | null>();

	async function update_bot_master_role() {
		const save_res = await fetch_as_json(
			'/api/update_settings',
			{
				body: JSON.stringify({
					updated_settings: { BOT_MASTER_ROLE: bot_master_role },
					guild_id
				}),
				method: 'POST'
			},
			z.object({ code: z.number(), message: z.string() })
		);

		if (save_res.isErr()) return add_toast_from_error(save_res.error);

		await invalidateAll();
		show_bot_master_modal = false;
		add_toast({
			label: 'Good Job!',
			message: 'Added Bot Master',
			timeout: 5000,
			type: 'success'
		});
	}

	async function load_monitors() {
		return await goto(`/dashboard/${guild_id}/monitors`);
	}

	async function load_new_ticket() {
		return await goto(`/dashboard/${guild_id}/ticket-panels/create-new`);
	}

	let show_bot_master_modal = $state(false);

	const total_credits = $derived(
		(data.d_guild?.monthly_budget_eurocents ?? 0) + (data.d_guild?.persistent_budget_eurocents ?? 0)
	);

	const monthly_credits_next_reset = $derived.by(() => {
		if (!data.d_guild?.monthly_budget_last_granted) return null;
		const avg_month = 1000 * 60 * 60 * 24 * 30;

		const last_granted = data.d_guild.monthly_budget_last_granted;

		return new Date(last_granted.getTime() + avg_month);
	});

	const as_frac_of_montly = $derived(total_credits / 500000);
</script>

<h1>Welcome, <span class="username">{data.session?.user.name}</span></h1>

<div class="header_section">
	<h2>Get Started</h2>
</div>
<div class="onboarding_section">
	<div class="checklist_sidebar">
		<ul class="todo_list">
			<li class="task" class:completed={data.guild_settings.BOT_MASTER_ROLE}>
				{#if data.guild_settings.BOT_MASTER_ROLE}
					<SquareCheck class="icon-success" />
				{:else}
					<Square />
				{/if}
				<div>
					<p>Set a <b>Bot Master</b> role</p>
					<small>Get your staff involved</small>
				</div>
				<Button
					disabled={!!data.guild_settings.BOT_MASTER_ROLE}
					variant="tetriary"
					on_click={() => (show_bot_master_modal = true)}>Go</Button
				>
			</li>

			<li class="task" class:completed={data.monitors_count >= 1}>
				{#if data.monitors_count >= 1}
					<SquareCheck class="icon-success" />
				{:else}
					<Square />
				{/if}
				<div>
					<p>Create a monitor</p>
					<small>Automate your watching</small>
				</div>
				<Button disabled={data.monitors_count >= 1} load_with={load_monitors} variant="tetriary"
					>Go</Button
				>
			</li>

			<li class="task" class:completed={data.ticket_panels_count >= 1}>
				{#if data.ticket_panels_count >= 1}
					<SquareCheck class="icon-success" />
				{:else}
					<Square />
				{/if}
				<div>
					<p>Create a ticket panel</p>
					<small>Get the tickets flowing</small>
				</div>
				<Button
					disabled={data.ticket_panels_count >= 1}
					variant="tetriary"
					load_with={load_new_ticket}>Go</Button
				>
			</li>
		</ul>
	</div>

	<div class="card_container">
		<a href="/dashboard/{guild_id}/threads" class="card threads">
			<div class="card_content">
				<SpoolIcon size={32} />
				<div class="stat">
					<span>{2}</span>
					<small>Threads Watched</small>
				</div>
			</div>
			<div class="card_gradient"></div>
		</a>

		<a href="/dashboard/{guild_id}/monitors" class="card monitors">
			<div class="card_content">
				<EyeIcon size={32} />
				<div class="stat">
					<span>{2}</span>
					<small>Active Monitors</small>
				</div>
			</div>
			<div class="card_gradient"></div>
		</a>

		<a class="card shard" href="/dashboard/{guild_id}/ticket-panels">
			<div class="card_content">
				<LayoutPanelLeft size={32} />
				<div class="stat">
					<span>{data.ticket_panels_count}</span>
					<small>Ticket Panels</small>
				</div>
			</div>
			<div class="card_gradient"></div>
		</a>
	</div>
</div>

<div class="header_section">
	<h2>AI Credits</h2>
	<p>Your server's shared pool for AI-powered summaries and smart actions.</p>
</div>

<div class="usage">
	<div style:width="{as_frac_of_montly * 100}%" class="inner">
		{(as_frac_of_montly * 100).toFixed(1)}%
	</div>

	{#if monthly_credits_next_reset && as_frac_of_montly < 0.6}
		<p class="new_credits_in">
			top-up {get_pwetty_relative_time(monthly_credits_next_reset)}
		</p>
	{/if}
</div>
{#if !gs.is_subscribed}
	<div class="upsell">
		<b>Running low on credits?</b>
		<p>
			Upgrade your server to <a href={PUBLIC_PREMIUM_SKU_STORE_LINK}>Thread-Watcher+</a> to enjoy a monthly
			top-up of AI credits alongside other great features!
		</p>
	</div>
{/if}

{#if show_bot_master_modal}
	<Modal title="Assign Bot Master" bind:set_open={show_bot_master_modal}>
		<SettingBox
			name="Bot Master"
			description="Select the role that can access the bot dashboard."
			disclaimer="Any role with Administrator will be considered a Bot Master"
		>
			<RolePicker bind:value={bot_master_role} roles={gs.roles} />
		</SettingBox>

		{#snippet buttons()}
			<Button load_with={update_bot_master_role} disabled={!bot_master_role} variant="primary"
				>Set</Button
			>
		{/snippet}
	</Modal>
{/if}

<div class="header_section">
	<h2>
		<a {@attach s_tooltip('View all tickets')} href="/dashboard/{guild_id}/tickets">
			<ExternalLink />
		</a>
		Need a Hand?
	</h2>
	<p>Open tickets where you're assigned or mentioned.</p>
</div>

{#if data.relevant_tickets.length > 0}
	<div class="tickets">
		{#each data.relevant_tickets as t}
			<div class="ticket">
				<div class="title">
					<b>{t.name}</b>
					<a target="_blank" href="/tickets/{t.ticket_id}">
						<ExternalLink />
					</a>
				</div>
				<UserLoader user_id={t.owner} />

				<div class="badges">
					<span class="badge time">{get_pwetty_relative_time(t.created_at)}</span>
					{#if t.claimed_by_user_id === data.session?.user.id}
						<span class="badge assigned">Assigned To You</span>
					{/if}
					{#if t.owner === data.session?.user.id}
						<span class="badge yours">Is Yours</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="placeholder">
		<Check />
		<p>All quiet on the ticket front.</p>
	</div>
{/if}

<div class="header_section">
	<h2>
		<a {@attach s_tooltip('View all logs')} href="/dashboard/{guild_id}/logs">
			<ExternalLink />
		</a>
		Recent Activity
	</h2>
	<p>These are the last few logs from your server.</p>
</div>
{#if data.recent_audits.length > 0}
	<div class="audits">
		{#each data.recent_audits as a}
			<div class="log">
				<AuditLog log={a} />
			</div>
		{/each}
	</div>
{:else}
	<div class="placeholder">
		<Ghost />
		<p>No audit trails found. Activity logs will appear here in real-time.</p>
	</div>
{/if}

<style lang="scss">
	.upsell {
		margin-top: 0.5rem;
		padding: 0.5rem 0.5rem;
		max-width: 45ch;
		background: radial-gradient(
			circle at top right,
			color-mix(in srgb, var(--premium-500) 10%, transparent),
			color-mix(in srgb, var(--premium-900) 5%, transparent) 70%
		);
		border: 1px solid color-mix(in srgb, var(--premium-500) 20%, transparent);
		border-radius: 0.25rem;
		opacity: 0.8;

		b {
			color: var(--premium-500);
		}
	}

	.usage {
		position: relative;
		width: 100%;
		background-color: var(--background-600);
		outline: 1px solid var(--background-800);
		border-radius: 0.25rem;
		overflow: hidden;

		.inner {
			background: radial-gradient(circle at top right, var(--primary-500), var(--primary-200) 70%);
			padding: 0.5rem 0rem;
			padding-right: 0.5rem;
			text-align: right;
		}

		.new_credits_in {
			position: absolute;
			display: flex;
			align-items: center;
			margin-right: 0.5rem;
			right: 0;
			top: 0;
			height: 100%;
			opacity: 0.5;
		}
	}

	.placeholder {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
		margin-bottom: 1rem;
		background-color: var(--primary-500);
		padding: 1rem;
		border-radius: 0.25rem;
		border: 1px solid var(--primary-900);
	}

	.header_section {
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;

		h2 {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 0.15rem;
		}

		p {
			opacity: 0.8;
		}
	}

	.tickets {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.5rem;

		.ticket {
			background-color: var(--background-600);
			border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
			border-radius: 0.25rem;
			display: flex;
			flex-direction: column;
			padding: 0.5rem 1rem;
			transition: 0.22s ease-in-out;

			&:hover {
				border: 1px solid color-mix(in srgb, var(--primary-500) 90%, transparent);
				transform: scale(1.01);
			}

			.title {
				display: flex;
				align-items: center;
				justify-content: space-between;
			}

			.badges {
				display: flex;
				align-items: center;
				gap: 0.25rem;
				margin-top: 0.25rem;
				overflow-x: scroll;

				.badge {
					padding: 0.1rem 0.5rem;
					border-radius: 1rem;
					font-size: smaller;
					white-space: nowrap;
					color: color-mix(in srgb, white 80%, transparent);
				}

				.time {
					border: 1px solid var(--primary-500);
				}

				.yours {
					border: 1px solid var(--error-500);
				}

				.assigned {
					border: 1px solid var(--success-500);
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
			gap: 0.5rem;
		}

		.task div {
			margin-right: auto;
		}
	}

	.username {
		color: var(--primary-900);
	}

	.onboarding_section {
		display: grid;
		grid-template-columns: 380px 1fr;
		gap: 2rem;
		margin-bottom: 3rem;

		@media (max-width: 1200px) {
			grid-template-columns: 1fr;
		}
	}

	.checklist_sidebar {
		background: var(--background-700);
		border: 1px solid var(--background-500);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.todo_list {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;

		.task {
			display: flex;
			align-items: center;
			gap: 1rem;
			padding: 0.5rem;
			border-radius: 0.5rem;
			transition: opacity 0.3s ease;

			&.completed {
				opacity: 0.5;
			}

			div {
				margin-right: auto;
			}
			p {
				margin: 0;
				font-size: 0.95rem;
			}
			small {
				opacity: 0.6;
				font-size: 0.8rem;
			}
		}
	}

	.card_container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		align-items: stretch;
	}

	.card {
		position: relative;
		background: var(--background-700);
		border: 1px solid var(--background-500);
		border-radius: 1rem;
		aspect-ratio: 1 / 0.8;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 1.5rem;
		text-decoration: none;
		color: white;
		overflow: hidden;
		transition:
			transform 0.2s ease,
			border-color 0.2s ease;

		@media (max-width: 1200px) {
			aspect-ratio: unset;
		}

		&:hover {
			transform: translateY(-4px);
			border-color: var(--card-color);

			.card_gradient {
				opacity: 0.15;
			}
		}

		&.threads {
			--card-color: #5865f2;
		}
		&.monitors {
			--card-color: #3ba55c;
		}
		&.shard {
			--card-color: #faa61a;
		}

		.card_content {
			z-index: 2;
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}

		.stat {
			display: flex;
			flex-direction: column;
			span {
				font-size: 2rem;
				font-weight: 900;
				line-height: 1;
			}
			small {
				text-transform: uppercase;
				letter-spacing: 1px;
				font-size: 0.7rem;
				opacity: 0.7;
				margin-top: 0.4rem;
			}
		}

		.card_gradient {
			position: absolute;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			background: radial-gradient(circle at top right, var(--card-color), transparent 70%);
			opacity: 0.05;
			transition: opacity 0.3s ease;
		}

		:global(svg) {
			color: var(--card-color);
		}
	}

	:global(.icon-success) {
		color: var(--primary-500);
	}
</style>
