<script lang="ts">
	import ChatContainer from '$lib/components/transcript/chat/ChatContainer.svelte';
	import Summaries from '$lib/components/transcript/summaries/summaries.svelte';
	import NavbarV2 from '$lib/components/ui/NavbarV2.svelte';
	import { init_guild_state } from '$lib/stores/guild.svelte';
	import { init_ticket_state } from '$lib/stores/ticket.svelte.js';
	import btn_style from '$lib/style/button.module.scss';
	import { File, Info, Menu } from '@lucide/svelte';
	import common from '$lib/style/common.module.scss';
	import ModNotes from '$lib/components/transcript/mod_notes/ModNotes.svelte';
	import type { DiscordUser } from '@watcher/shared';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte';
	import { map_err } from '$lib/error_helper';
	import User from '$lib/components/ui/discord/user/User.svelte';
	import UserLoader from '$lib/components/ui/discord/user/UserLoader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TWMarkdown from '$lib/components/ui/Markdown/TWMarkdown.svelte';

	const { data } = $props();

	// svelte-ignore state_referenced_locally
	const gs = init_guild_state(data.ticket.guild_id);

	// svelte-ignore state_referenced_locally
	const ts = init_ticket_state(data.ticket, gs);

	const logs_stale = $derived.by(() => {
		const time_elapsed = Date.now() - data.ticket.created_at.getTime();
		const week_as_ms = 1000 * 60 * 60 * 24 * 7;
		return time_elapsed > week_as_ms;
	});

	const pipeline_logs_location = $derived(
		`https://cdn.threadwatcher.xyz/logs/${data.ticket.ticket_id}_pipeline.txt`
	);

	const panel_location = $derived(
		`/dashboard/${data.ticket.guild_id}/ticket-panels/${data.ticket.panel_id}`
	);

	const status = $derived.by(() => {
		switch (data.ticket.status) {
			case 'OPEN':
				return { colour: 'var(--success-500)', text: 'Open' };
			case 'CLOSED':
				return { colour: 'var(--error-500)', text: 'Closed' };
		}
	});

	$effect(() => {
		document.documentElement.style.overflow = 'hidden';
		return () => {
			document.documentElement.style.overflow = '';
		};
	});

	let viewport_width = $state(0);

	const show_overlay = $derived(viewport_width < 1000);
	let navbar_extended = $state(true);

	async function mark_resolved() {
		const res = await ts.mark_resolved();
		if (res.isErr()) return add_toast_from_error(res.error);
		data.ticket.status === "CLOSED"
		ts.ticket?.status === "CLOSED"
		add_toast({ type: 'success', message: `Ticket '${data.ticket.name}' was resolved!` });
	}

	let is_deleted = $state(false)

	async function delete_ticket() {
		const res = await ts.delete()
		if(res.isErr()) return add_toast_from_error(res.error)
		is_deleted = true
	}

	const master_summary = $derived(data.ticket.summaries.find(s => s.is_master_summary))
</script>

<svelte:window bind:innerWidth={viewport_width} />

{#if is_deleted}
	<div class="is_deleted">
		<Info />
		This ticket is <b>DELETED.</b>
	</div>
{/if}

{#if show_overlay && !navbar_extended}
	<button class="expand_button floating" onclick={() => (navbar_extended = true)}>
		<Menu />
	</button>
{/if}

<main>
	<ChatContainer />

	<NavbarV2 bind:is_expanded={navbar_extended} overlay={show_overlay} direction="right">
		{#if show_overlay}
			<button class="expand_button" onclick={() => (navbar_extended = false)}>
				<Menu />
			</button>
		{/if}

		<div class="ticket_name">
			<div class={[common.row, common.space_between]}>
				<h2 class="ticket_name_actual_name">{data.ticket.name}</h2>
				<div class="badge" style="--clr: {status.colour}">
					<div class="circle"></div>
					{status.text}
				</div>
			</div>

			{#if master_summary}
				<div class="master_summary">
					<b>{master_summary.summary_title}</b>
					<TWMarkdown md={master_summary.summary_text} />
					<small>Master Summary</small>
				</div>
			{/if}
		</div>

		<h3 class="heading">Actions</h3>
		<div>
			<Button load_with={delete_ticket} confirmation={{ title: "Delete Ticket", body: "This will permanently close the ticket and cannot be undone. All associated data will be removed from our records.", proceed_btn_text: `Delete '${data.ticket.name}'`, cancel_btn_text: "Cancel" }} variant="error">Delete Ticket</Button>
			<Button load_with={mark_resolved} disabled={ts.ticket?.status === "CLOSED"}>Resolve Ticket</Button>
		</div>

		<hr />

		<h3 class="heading">Ticket User</h3>
		<UserLoader user_id={data.ticket.owner} />

		{#if data.ticket.claimed_by_user_id}
			<h3 class="heading">Claimed By</h3>
			<UserLoader user_id={data.ticket.claimed_by_user_id} />
		{/if}

		<hr />

		{#if data.ticket.summaries.length > 0}
			<h3 class="heading">Summaries</h3>
			<Summaries />
		{/if}

		<h3 class="heading">Mod Notes</h3>
		<small>Mod notes can only be viewed by the moderation team and are never shared with the ticket creator or AI summarizer.</small>
		<ModNotes />

		<hr />

		<div>
			<a href={pipeline_logs_location} target="_blank"> Pipeline Logs </a>
			<a href={panel_location} target="_blank"> Responsible Panel </a>
			<a href="/policies/privacy-policy" target="_blank"> Privacy Policy </a>
			<a href="/policies/terms-of-service" target="_blank"> Terms of Service </a>
		</div>
	</NavbarV2>
</main>

<style lang="scss">

	.is_deleted {
		position: absolute;
		top: 0;
		display: flex;
		align-items: center;
		gap: .5rem;
		margin: 1rem;
		padding: .5rem .25rem;
		background-color: var(--error-500);
		border: 1px solid var(--error-700);
		border-radius: .5rem;
		z-index: 99999999999999;
	}

	.master_summary {
		padding: 1rem;
		background-color: var(--secondary-500);
		border: 1px solid var(--secondary-700);
		border-radius: .25rem;
		margin-bottom: .5rem;
		margin-top: .5rem;

		b {
			opacity: .7;
		}

		small {
			opacity: .4;
		}
	}

	hr {
		margin-top: 1rem;
		margin-bottom: 1rem;
		opacity: 0.3;
	}

	main {
		display: flex;
		height: 100vh;
	}

	.heading {
		opacity: 0.7;
		margin-bottom: 0.5rem;
		margin-top: 1rem;
	}

	.ticket_name {
		background-color: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.ticket_name_actual_name {
		flex-shrink: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge {
		flex-shrink: 0;
		--theme_clr: var(--clr, green);
		display: inline-flex;
		padding: 0.1rem 0.5rem;
		border-radius: 0.5rem;
		align-items: center;
		gap: 0.25rem;

		background-color: color-mix(in srgb, var(--theme_clr) 10%, transparent);
		color: color-mix(in srgb, var(--theme_clr) 10%, white);
		outline: 1px solid color-mix(in srgb, var(--theme_clr) 50%, transparent);

		.circle {
			height: 1vh;
			width: 1vh;
			border-radius: 50%;
			background-color: var(--theme_clr);
		}
	}

	.expand_button {
		background-color: #131313;
		color: white;
		border: none;
		padding: 0.5rem;
		margin: 0.5rem 0.1rem;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, #121212 90%, white);

		&.floating {
			position: absolute;
			top: 0;
			right: 0;
			margin: 1rem;
			z-index: 200;
		}
	}
</style>
