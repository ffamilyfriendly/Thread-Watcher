export async function load({ locals }) {
	const u = await locals.auth();
	if (u) return { session: u };
}
