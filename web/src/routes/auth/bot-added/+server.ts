// src/routes/auth/bot-callback/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');
	const guild_id = url.searchParams.get('guild_id');

	throw redirect(303, `/dashboard/${guild_id}`);
};
