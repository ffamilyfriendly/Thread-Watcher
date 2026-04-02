import {
	ZMessagesView,
	ZTicketNote,
	type MessagesSeachFilter,
	type PublicTicketMessage,
	type TicketNote,
	type TicketView
} from '@watcher/shared';
import { getContext, setContext } from 'svelte';
import type { GuildState } from './guild.svelte';
import { fetch_as_json, safe_fetch } from '$lib/client/fetch';
import { err, ok } from 'neverthrow';
import z from 'zod';

export class TicketState {
	ticket = $state<TicketView>();
	messages = $state<PublicTicketMessage[]>([]);

	constructor(
		ticket: TicketView,
		private guild_state: GuildState
	) {
		this.ticket = ticket;
		this.guild_state.append_users(Object.values(ticket.users));
		this.messages = ticket.messages;
	}

	update_messages(new_messages: PublicTicketMessage[]) {
		const merged = [...this.messages, ...new_messages];
		const deduped = new Map(merged.map((m) => [m.message_id, m]));
		this.messages = [...deduped.values()].sort((a, b) => (a.message_id < b.message_id ? -1 : 1));
	}

	async get_messages(filters: MessagesSeachFilter) {
		const params = new URLSearchParams();
		for (const [key, val] of Object.entries(filters)) {
			if (val) params.set(key, val.toString());
		}

		const messages = await fetch_as_json(
			`/api/ticket/${this.ticket?.ticket_id}/messages?${params.toString()}`,
			undefined,
			ZMessagesView
		);
		if (messages.isErr()) return err(messages.error);

		this.guild_state.append_users(Object.values(messages.value.users));

		this.update_messages(messages.value.messages);

		return ok(messages.value.messages);
	}

	async create_note(note_text: string) {
		const created_note = await fetch_as_json(
			`/api/ticket/${this.ticket?.ticket_id}/notes`,
			{
				body: JSON.stringify({ text: note_text }),
				method: 'POST'
			},
			ZTicketNote
		);

		if (created_note.isErr()) return err(created_note.error);
		const new_note: TicketNote = created_note.value;
		this.ticket?.notes.push(new_note);
		return ok(new_note);
	}

	async delete_note(note_id: string) {
		const deleted_note = await fetch_as_json(
			`/api/ticket/${this.ticket?.ticket_id}/notes/${note_id}`,
			{ method: 'DELETE' }
		);
		if (deleted_note.isErr()) return err(deleted_note.error);
		if (this.ticket?.notes)
			this.ticket.notes = this.ticket.notes.filter((n) => n.note_id !== note_id);
		return ok();
	}

	async flag_attachment(attachment_id: string) {
		const could_flag = await fetch_as_json(
			`/api/ticket/${this.ticket?.ticket_id}/attachment/${attachment_id}`,
			{ method: 'DELETE' }
		);
		if (could_flag.isErr()) return err(could_flag.error);
		this.messages.forEach((m) => m.attachments.filter((a) => a.attachment_id !== attachment_id));
		return ok();
	}

	async mark_resolved() {
		const could_resolve = await fetch_as_json(`/api/ticket/${this.ticket?.ticket_id}`, {
			method: 'POST'
		});
		if (could_resolve.isErr()) return err(could_resolve.error);
		this.ticket?.status === 'CLOSED';
		return ok();
	}

	async delete() {
		const could_delete = await fetch_as_json(`/api/ticket/${this.ticket?.ticket_id}`, {
			method: 'DELETE'
		});
		if (could_delete.isErr()) return err(could_delete.error);
		return ok();
	}
}

const TICKET_KEY = Symbol('ticket');

export function init_ticket_state(ticket: TicketView, guild_state: GuildState) {
	return setContext(TICKET_KEY, new TicketState(ticket, guild_state));
}

export function use_ticket_state() {
	const state = getContext<TicketState>(TICKET_KEY);
	if (!state) throw new Error("'use_ticket_state' called outside of provider");
	return state;
}
