<script lang="ts">
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import { Plus, Send } from '@lucide/svelte';
	import Modnote from './modnote.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';

	const ts = use_ticket_state();

	let new_note_text = $state<string>();

	async function create_note() {
		if (!new_note_text) return;
		const could_create = await ts.create_note(new_note_text);
		if (could_create.isErr()) return add_toast_from_error(could_create.error);
		new_note_text = '';
	}
</script>

{#if ts.ticket?.notes}
	<div class="summaries">
		{#each ts.ticket.notes as note, idx (note.note_id)}
			<Modnote {note} />

			{#if idx !== ts.ticket.notes.length - 1}
				<div class="divider"></div>
			{/if}
		{/each}
		{#if ts.ticket.notes.length === 0}
			<i>No mod notes found</i>
		{/if}
	</div>
	<div style="margin-top: 0.5rem;" class="summaries">
		<div class="new_note">
			<input bind:value={new_note_text} placeholder="new note" type="text" />
			<button onclick={create_note} disabled={(new_note_text?.length ?? 0) < 1}>
				<Plus />
			</button>
		</div>
	</div>
{/if}

<style lang="scss">
	.new_note {
		display: flex;
		align-items: center;
		input {
			flex-grow: 1;
			background-color: transparent;
			color: white;
			border: none;
		}

		button {
			cursor: pointer;
			border: none;
			border-left: 1px solid color-mix(in srgb, var(--secondary-800) 40%, transparent);
			padding: 0.25rem 0.5rem;
			background-color: transparent;
			color: color-mix(in srgb, var(--secondary-800) 40%, white);

			&:disabled {
				opacity: 0.2;
				cursor: no-drop;
			}
		}
	}

	.summaries {
		padding: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--secondary-800) 40%, transparent);
		background-color: color-mix(in srgb, var(--secondary-800) 20%, transparent);
	}

	.divider {
		width: 100%;
		height: 1px;
		background-color: color-mix(in srgb, var(--secondary-800) 40%, transparent);
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
</style>
