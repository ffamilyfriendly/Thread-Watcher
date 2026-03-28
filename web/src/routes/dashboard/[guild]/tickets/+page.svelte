<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { get_pwetty_relative_time } from '$lib/client/time_util';
	import Button from '$lib/components/ui/Button.svelte';
	import UserLoader from '$lib/components/ui/discord/user/UserLoader.svelte';
	import { TW_TICKET_LIMIT_DEFAULT } from '@watcher/shared';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	page.url.searchParams.get('sigma');

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

	<button class="clear_btn" onclick={() => goto(page.url.pathname)}> Reset </button>
</div>

<div class="table_container">
	<table>
		<thead>
			<tr>
				<th>Ticket Name</th>
				<th>Owner</th>
				<th>Claimed By</th>
				<th>Last activity</th>
				<th>Status</th>
				<td class="align_right">Action</td>
			</tr>
		</thead>
		<tbody>
			{#each data.tickets as ticket}
				<tr class="ticket_row">
					<td class="name_cell">
						<span class="name">{ticket.name}</span>
						<span class="id">{ticket.ticket_id}</span>
					</td>
					<td>
						<UserLoader user_id={ticket.owner} />
					</td>
					<td>
						{#if ticket.claimed_by_user_id}<UserLoader user_id={ticket.claimed_by_user_id} />
						{/if}
					</td>
					<td class="time_cell">{get_pwetty_relative_time(ticket.last_activity)}</td>
					<td>
						<span class="status_badge" data-status={ticket.status.toLowerCase()}>
							{ticket.status}
						</span>
					</td>
					<td>
						<a class="view_btn" target="_blank" href="/tickets/{ticket.ticket_id}">View</a>
					</td>
				</tr>
			{/each}
			{#if data.tickets.length === 0}
				<tr>
					<td> No results found with current filters. </td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<div class="buttons">
	<Button
		variant="tetriary"
		disabled={offset === 0}
		load_with={() => update_filter('offset', get_prev_offset())}>Previous</Button
	>
	<Button
		disabled={data.tickets.length < limit}
		load_with={() => update_filter('offset', get_next_offset())}>Next</Button
	>
</div>

<style lang="scss">
	.buttons {
		display: flex;
		justify-content: right;
		margin-top: 1rem;
		gap: 0.5rem;
	}

	.table_container {
		width: 100%;
		background: var(--background-800);
		border: 1px solid color-mix(in srgb, var(--background-800) 90%, white);
		border-radius: 8px;
		overflow: hidden;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.9rem;
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
		gap: 20px;
		align-items: flex-end;
		background: var(--background-800);
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: 8px;
		margin-bottom: 16px;
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
</style>
