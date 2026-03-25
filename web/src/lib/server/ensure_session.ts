import type { Session } from '@auth/sveltekit';

/**
 * @description get auth or throw error. Throwing is fine as the sveltekit router handles any thrown errors
 */
export default async function (locals: App.Locals): Promise<Session> {
	const auth = await locals.auth();
	if (!auth) {
		throw new Error('You are not authenticated!');
	}
	return auth;
}
