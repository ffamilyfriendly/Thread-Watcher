import { handle as auth_handle, signIn } from '$lib/server/auth';
import { redirect, type Handle, type ResolveOptions } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const authorization_handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/dashboard')) {
		const session = await event.locals.auth();

		if (!session) {
			event.cookies.set('redirect_to', event.url.pathname, {
				path: '/',
				httpOnly: true,
				maxAge: 60 * 5
			});
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};

export const handle: Handle = sequence(auth_handle, authorization_handle);
