import { json_fetch } from '$lib/server/api';
import ensure_session from '$lib/server/ensure_session';
import type { Actions } from '@sveltejs/kit';
import { ZLibraryEntry } from '@watcher/shared';
import z from 'zod';

export async function load({ locals, params, url }) {
	const guild_id = params.guild;
	const user = await ensure_session(locals);

	const guild_files = await json_fetch(
		`/guild/${guild_id}/library/files`,
		{ user_id: user.user.id },
		z.object({
			files: z.array(ZLibraryEntry),
			usage: z
				.object({
					chunks_used: z.number(),
					usage: z.number(),
					can_add_more: z.coerce.boolean()
				})
				.nullish()
		})
	);

	if (guild_files.isErr()) throw guild_files.error;

	return { guild_files: guild_files.value };
}

export const actions = {
	upload: async ({ request, locals, params }) => {
		const user = await ensure_session(locals);
		const guild_id = params.guild;

		if (!guild_id) return { success: false, error: 'no guild_id passed :(' };

		const data = await request.formData();
		const file = data.get('file');

		if (!file) {
			return { success: false, error: 'No file provided!' };
		}

		const backend_form = new FormData();
		backend_form.append('file', file);

		const res = await json_fetch(
			`/guild/${guild_id}/library`,
			{
				user_id: user.user.id,
				method: 'POST',
				body: backend_form
			},
			z.object({
				upload: ZLibraryEntry
			})
		);

		if (res.isErr()) return { success: false, error: res.error.name };

		return { success: true, new_upload: res.value.upload };
	},
	remove_upload: async ({ request, locals, params }) => {
		const user = await ensure_session(locals);
		const guild_id = params.guild;

		const data = await request.formData();
		const file_id = data.get('file_id');
		if (!file_id) return { success: false, error: 'no file_id provided' };

		const res = await json_fetch(`/guild/${guild_id}/library/files/${file_id}`, {
			user_id: user.user.id,
			method: 'DELETE'
		});

		if (res.isErr()) return { success: false, error: res.error.name };

		return { success: true };
	}
} satisfies Actions;
