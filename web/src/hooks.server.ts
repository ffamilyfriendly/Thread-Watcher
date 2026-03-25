import { dev } from '$app/environment';
import { FancyAPIError } from '$lib/server/api';
import { handle as auth_handle, signIn } from '$lib/server/auth';
import { redirect, type Handle, type HandleServerError, type ResolveOptions } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const authorization_handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/dashboard') || event.url.pathname.startsWith('/ticket')) {
		const session = await event.locals.auth();

		if (!session || session.error) {
			event.cookies.set('redirect_to', event.url.pathname, {
				path: '/',
				httpOnly: true,
				maxAge: 60 * 5
			});

			throw redirect(303, '/login');
		}

		event.locals.user = session.user;
	}

	return resolve(event);
};

export const handle: Handle = sequence(auth_handle, authorization_handle);

export const handleError: HandleServerError = ({ error, event }) => {
	if (error instanceof FancyAPIError) {
		return {
			message: error.message,
			dev_details: dev ? error.dev_details : undefined,
			status: error.status_code
		};
	}

	return {
		message: 'An unexpected internal error happened',
		dev_details: dev ? (error as any)?.stack : undefined
	};
};
