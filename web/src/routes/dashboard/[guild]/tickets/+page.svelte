<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { get_pwetty_relative_time } from '$lib/client/time_util';
	import Button from '$lib/components/ui/Button.svelte';
	import UserLoader from '$lib/components/ui/discord/user/UserLoader.svelte';
	import { TW_TICKET_LIMIT_DEFAULT } from '@watcher/shared';
	import type { PageProps } from './$types';
	import { ExternalLink, Rss } from '@lucide/svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import z from 'zod';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte';
	import { fetch_as_json } from '$lib/client/fetch';
	import StringPicker from '$lib/components/ui/settings/StringPicker.svelte';

	const { data, params }: PageProps = $props();

	function update_filter(key: string, value?: string) {
		const url = new URL(page.url);
		if (value) {
			url.searchParams.set(key, value);
		} else {
			url.searchParams.delete(key);
		}
		if (key !== 'offset') url.searchParams.delete('offset');
		return goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function get_next_offset() {
		return (offset + data.tickets.length).toString();
	}

	function get_prev_offset() {
		return Math.max(offset - limit, 0).toString();
	}

	const offset_str = $derived(page.url.searchParams.get('offset'));
	const offset = $derived(offset_str ? Number(offset_str) : 0);

	const limit_str = $derived(page.url.searchParams.get('limit'));
	const limit = $derived(limit_str ? Number(limit_str) : TW_TICKET_LIMIT_DEFAULT);

	let show_rss = $state(false);
	let default_rss_duration = $state('14d');
	let default_rss_feed_name = $state('Subscribed Tickets');
	let rss_feed_url = $state<string>();

	async function get_rss_subscription() {
		let param_wrapper: Record<string, string> = {};
		for (const p of page.url.searchParams) {
			param_wrapper[p[0]] = p[1];
		}
		const payload = {
			guild_id: params.guild,
			exp: default_rss_duration,
			feed_name: default_rss_feed_name,
			...param_wrapper
		};
		const res = await fetch_as_json(
			`/RSS/tickets`,
			{ method: 'POST', body: JSON.stringify(payload) },
			z.object({ sub_url: z.url() })
		);
		if (res.isErr()) return add_toast_from_error(res.error);
		rss_feed_url = res.value.sub_url;
	}

	async function share_feed() {
		if (!rss_feed_url) return;
		if (navigator.share) {
			try {
				await navigator.share({
					title: default_rss_feed_name,
					text: 'Subscribe to my Thread-Watcher ticket feed',
					url: rss_feed_url
				});
			} catch (err) {
				console.error('Share failed:', err);
			}
		} else {
			navigator.clipboard.writeText(rss_feed_url);
			add_toast({ message: 'Link copied to clipboard!', type: 'success' });
		}
	}
</script>

<div class="filter_bar">
	<div class="filter_group">
		<label for="status">Status</label>
		<select
			id="status"
			value={page.url.searchParams.get('status') ?? ''}
			onchange={(e) => update_filter('status', e.currentTarget.value)}
		>
			<option value="">All Statuses</option>
			<option value="OPEN">Open</option>
			<option value="CLOSED">Closed</option>
		</select>
	</div>

	<div class="filter_group">
		<label for="panel">Panel</label>
		<select
			id="panel"
			value={page.url.searchParams.get('panel_id') ?? ''}
			onchange={(e) => update_filter('panel_id', e.currentTarget.value)}
		>
			<option value="">All Panels</option>
			{#each data.panels as panel}
				<option value={panel.panel_id}>{panel.name}</option>
			{/each}
		</select>
	</div>

	<div class="filter_group search">
		<label for="owner">Owner ID</label>
		<input
			id="owner"
			type="text"
			placeholder="Search by User ID..."
			value={page.url.searchParams.get('ticket_owner') ?? ''}
			oninput={(e) => {
				const val = e.currentTarget.value;
				if (val.length === 0 || val.length >= 17) update_filter('ticket_owner', val);
			}}
		/>
	</div>

	<div class="filter_group search">
		<label for="claimed">Claimed by ID</label>
		<input
			id="claimed"
			type="text"
			placeholder="Search by User ID..."
			value={page.url.searchParams.get('assigned_to_user_id') ?? ''}
			oninput={(e) => {
				const val = e.currentTarget.value;
				if (val.length === 0 || val.length >= 17) update_filter('assigned_to_user_id', val);
			}}
		/>
	</div>

	<button class="clear_btn" onclick={() => goto(page.url.pathname)}>Reset</button>
</div>

<div class="table_container">
	<table>
		<thead>
			<tr>
				<th>Ticket Name</th>
				<th>Owner</th>
				<th>Claimed By</th>
				<th>Last Activity</th>
				<th>Status</th>
				<th class="align_right">Action</th>
			</tr>
		</thead>
		<tbody>
			{#each data.tickets as ticket}
				<tr class="ticket_row">
					<td class="name_cell">
						<span class="name">{ticket.name}</span>
						<span class="id">{ticket.ticket_id}</span>
					</td>
					<td data-label="Owner">
						<UserLoader user_id={ticket.owner} />
					</td>
					<td data-label="Claimed">
						{#if ticket.claimed_by_user_id}
							<UserLoader user_id={ticket.claimed_by_user_id} />
						{/if}
					</td>
					<td data-label="Activity" class="time_cell">
						{get_pwetty_relative_time(ticket.last_activity)}
					</td>
					<td data-label="Status">
						<span class="status_badge" data-status={ticket.status.toLowerCase()}>
							{ticket.status}
						</span>
					</td>
					<td data-label="Action">
						<a class="view_btn" target="_blank" href="/tickets/{ticket.ticket_id}">View</a>
					</td>
				</tr>
			{/each}
			{#if data.tickets.length === 0}
				<tr>
					<td colspan="6">No results found with current filters.</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

{#if show_rss}
	<Modal title="Get RSS Subscription" bind:set_open={show_rss}>
		{#snippet buttons()}
			{#if rss_feed_url}
				<Button load_with={share_feed} variant="tetriary">Share Feed</Button>
			{/if}
			<Button load_with={get_rss_subscription}>Subscribe</Button>
		{/snippet}
		<p>
			Create a <a href="https://en.wikipedia.org/wiki/RSS">RSS</a> subscription for any ticket matching
			your selected filters.
		</p>
		<p>
			This RSS feed can be used by a RSS reader, like <a href="https://www.newsblur.com/"
				>NewsBlur</a
			>, or a browser extension such as
			<a
				href="https://chromewebstore.google.com/detail/rss-feed-reader/pnjaodmkngahhkoihejjehlcdlnohgmp?pli=1"
			>
				RSS Feed Reader
			</a>, allowing you a fast and easy way to keep track of your tickets.
		</p>
		<b class="lable">Subscription Name</b>
		<input
			max="100"
			min="3"
			class="rss_feed_name"
			placeholder="Feed Name"
			bind:value={default_rss_feed_name}
		/>
		<b class="lable">Subscription Duration</b>
		<StringPicker
			bind:value={default_rss_duration}
			options={[
				{ name: '2 weeks', id: '14d' },
				{ name: '30 days', id: '30d' },
				{ name: '90 days', id: '90d' }
			]}
		/>
		<small>
			Never share your subscription link with anyone as that gives them access to the ticket list.
			There's currently no way to cancel a subscription.
		</small>

		{#if rss_feed_url}
			<div class="rss_created">
				<Rss />
				<div>
					<a href={rss_feed_url}>{default_rss_feed_name} <ExternalLink size="1rem" /></a>
					<small>{rss_feed_url}</small>
				</div>
			</div>
		{/if}
	</Modal>
{/if}

<div class="action_segs">
	<Button on_click={() => (show_rss = !show_rss)}><Rss size={16} /> Subscribe</Button>
	<div class="buttons">
		<Button
			variant="tetriary"
			disabled={offset === 0}
			load_with={() => update_filter('offset', get_prev_offset())}
		>
			Previous
		</Button>
		<Button
			disabled={data.tickets.length < limit}
			load_with={() => update_filter('offset', get_next_offset())}
		>
			Next
		</Button>
	</div>
</div>

<style lang="scss">
	.rss_feed_name {
		padding: 0.75rem;
		color: white;
		background-color: var(--background-700);
		border: 1px solid var(--background-900);
		border-radius: 0.25rem;
		margin-top: 0.25rem;
		width: 100%;
	}

	.lable {
		margin-top: 0.5rem;
		opacity: 0.7;
		display: block;
	}

	.rss_created {
		max-width: 100%;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: color-mix(in srgb, var(--success-500), transparent);
		border: 1px solid var(--success-500);
		padding: 0.75rem;
		margin-top: 1rem;
		border-radius: 0.25rem;

		:global(svg) {
			flex-shrink: 0;
			color: var(--success-500);
		}

		div {
			display: flex;
			flex-direction: column;
			min-width: 0;

			a {
				color: white;
				font-weight: 600;
				display: flex;
				align-items: center;
				gap: 0.4rem;
				text-decoration: none;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;

				&:hover {
					text-decoration: underline;
				}
			}

			small {
				color: rgba(255, 255, 255, 0.5);
				font-family: monospace;
				font-size: 0.7rem;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				user-select: all;
				opacity: 0.8;
			}
		}
	}

	.action_segs {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1rem;

		@media (max-width: 600px) {
			flex-direction: column;
			gap: 0.5rem;

			.buttons {
				width: 100%;
				justify-content: space-between;
				margin-top: 0;
			}
		}
	}

	.buttons {
		display: flex;
		justify-content: right;
		gap: 0.5rem;
	}

	.table_container {
		width: 100%;
		background: var(--background-800);
		border: 1px solid color-mix(in srgb, var(--background-800) 90%, white);
		border-radius: 8px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;

		@media (max-width: 600px) {
			border: none;
			background: transparent;
			overflow: visible;
		}
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.9rem;
		min-width: 600px;

		@media (max-width: 600px) {
			min-width: unset;
		}
	}

	thead {
		background: var(--background-900);
		color: gray;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: 0.75rem;

		th {
			padding: 12px 16px;
			font-weight: 600;
			border-bottom: 1px solid color-mix(in srgb, var(--background-800) 90%, white);
		}

		@media (max-width: 600px) {
			display: none;
		}
	}

	.ticket_row {
		border-bottom: 1px solid color-mix(in srgb, var(--background-700) 90%, white);
		transition: background 0.15s ease;

		&:hover {
			background: rgba(255, 255, 255, 0.03);
		}

		&:last-child {
			border-bottom: none;
		}

		@media (max-width: 600px) {
			display: block;
			background: var(--background-800);
			border: 1px solid color-mix(in srgb, var(--background-800) 90%, white);
			border-radius: 8px;
			margin-bottom: 12px;
			padding: 12px;

			td {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 6px 0;
				border-bottom: 1px solid color-mix(in srgb, var(--background-700) 90%, white);

				&:last-child {
					border-bottom: none;
				}

				&[data-label]::before {
					content: attr(data-label);
					font-size: 0.7rem;
					font-weight: 700;
					text-transform: uppercase;
					color: gray;
					min-width: 70px;
					flex-shrink: 0;
				}
			}

			.name_cell {
				flex-direction: column;
				align-items: flex-start;
				border-bottom: 1px solid color-mix(in srgb, var(--background-700) 90%, white);
				padding-bottom: 8px;
				margin-bottom: 4px;
			}
		}
	}

	td {
		padding: 12px 16px;
		vertical-align: middle;
		color: white;
	}

	.name_cell {
		display: flex;
		flex-direction: column;

		.name {
			font-weight: 500;
			color: var(--primary-900);
		}

		.id {
			font-size: 0.7rem;
			color: gray;
		}
	}

	.status_badge {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		background: var(--background-700);

		&[data-status='open'] {
			color: #43b581;
			background: rgba(67, 181, 129, 0.1);
		}
		&[data-status='closed'] {
			color: #f04747;
			background: rgba(240, 71, 71, 0.1);
		}
		&[data-status='claimed'] {
			color: #7289da;
			background: rgba(114, 137, 218, 0.1);
		}
	}

	.view_btn {
		background: var(--primary);
		color: white;
		padding: 6px 12px;
		border-radius: 4px;
		text-decoration: none;
		font-weight: 500;
		transition: filter 0.2s;

		&:hover {
			filter: brightness(1.2);
		}
	}

	.filter_bar {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: flex-end;
		background: var(--background-800);
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: 8px;
		margin-bottom: 16px;

		@media (max-width: 768px) {
			flex-direction: column;
			align-items: stretch;

			.filter_group {
				width: 100%;

				input,
				select {
					width: 100%;
					min-width: 0 !important;
					box-sizing: border-box;
				}
			}

			.clear_btn {
				margin-left: 0;
				text-align: center;
				width: 100%;
				padding: 10px;
				background: var(--background-900);
				border-radius: 4px;
			}
		}
	}

	.filter_group {
		display: flex;
		flex-direction: column;
		gap: 6px;

		label {
			font-size: 0.75rem;
			font-weight: 700;
			color: var(--text-muted);
			text-transform: uppercase;
		}

		select,
		input {
			background: var(--background-900);
			border: 1px solid var(--border);
			color: var(--text-normal);
			padding: 8px 12px;
			border-radius: 4px;
			font-size: 0.9rem;
			outline: none;

			&:focus {
				border-color: var(--primary);
			}
		}
	}

	.search input {
		min-width: 240px;
	}

	.clear_btn {
		margin-left: auto;
		color: var(--text-muted);
		font-size: 0.85rem;
		background: none;
		border: none;
		cursor: pointer;
		padding-bottom: 8px;

		&:hover {
			color: var(--text-focus);
			text-decoration: underline;
		}
	}

	.align_right {
		text-align: right;
	}

	.time_cell {
		white-space: nowrap;
	}
</style>
