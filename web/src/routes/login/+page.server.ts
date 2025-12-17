import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals }) {
	const auth = await locals.auth();

	if (auth) {
		const redir_to = cookies.get('redirect_to') || '/dashboard';
		throw redirect(301, redir_to);
	}

	return {};
}
