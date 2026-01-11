import { redirect } from '@sveltejs/kit';

export async function load({ cookies, locals }) {
	const auth = await locals.auth();

	if (auth && !auth.error) {
		const redir_to = cookies.get('redirect_to') || '/dashboard';
		cookies.delete('redirect_to', { path: '/' });
		throw redirect(303, redir_to);
	}

	return {};
}
