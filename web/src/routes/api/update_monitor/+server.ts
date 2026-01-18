import { fetch_role } from '$lib/server/data_fetchers';
import { json } from '@sveltejs/kit';
import { ZEditMonitor } from '@watcher/shared';

export async function PATCH({ locals, request }) {
    const auth = await locals.auth();
    const body = await request.json();
    if (!auth?.user.id) {
        return json(
            {
                code: 401,
                message: 'you are not logged in'
            },
            { status: 401 }
        );
    }

	const parsed_body = ZEditMonitor.safeParse(body);
    if(!parsed_body.success) {
        return json(
		{
			code: 400,
			message: 'malformed request!'
		},
		{ status: 400 }
	);
    }

	return json(
		{
			code: 401,
			message: 'you are not logged in'
		},
		{ status: 401 }
	);
}
