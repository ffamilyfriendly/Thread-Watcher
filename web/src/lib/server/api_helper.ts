import { json } from '@sveltejs/kit';
import { type Result } from 'neverthrow';
import type z from 'zod';
import { APIError } from './api';

type Handler<T> = (data: T, user_id: string) => Promise<Result<any, any>>;

export function return_sveltekit_http_err(error: Error) {
	if (error instanceof APIError) {
		return json({ code: error.status_code, message: error.message }, { status: error.status_code });
	}

	return json({ code: 500, message: error.message }, { status: 500 });
}

export async function with_api_auth<T>(
	{ locals, request }: { locals: App.Locals; request: Request },
	data: T,
	handler: Handler<T>
) {
	const auth = await locals.auth();
	if (!auth?.user.id) return json({ code: 401, message: 'unathorized' }, { status: 401 });

	const result = await handler(data, auth.user.id);

	return result.match(
		(val) => json(val, { status: 200 }),
		(error) => {
			if (error instanceof APIError) {
				return json(
					{ code: error.status_code, message: error.message },
					{ status: error.status_code }
				);
			}

			return json({ code: 500, message: error.message }, { status: 500 });
		}
	);
}

export async function with_schema_auth<T>(
	{ locals, request }: { locals: App.Locals; request: Request },
	schema: z.ZodType<T>,
	handler: Handler<T>
) {
	const body = await request.json();
	const parsed = schema.safeParse(body);
	if (!parsed.success)
		return json(
			{ code: 400, message: 'malformed request body', issues: parsed.error },
			{ status: 400 }
		);

	return with_api_auth({ locals, request }, parsed.data, handler);
}

export async function with_query_auth<const K extends string>(
	{
		locals,
		request,
		url
	}: {
		locals: App.Locals;
		request: Request;
		url: URL;
	},
	required_params: K[],
	handler: Handler<{ [P in K]: string }>
) {
	let params = {} as { [P in K]: string };

	for (const param of required_params) {
		const param_value = url.searchParams.get(param);
		if (!param_value)
			return json(
				{ code: 400, message: `Malformed request. Missing required parameter '${param}'` },
				{ status: 400 }
			);
		params[param] = param_value;
	}

	return with_api_auth({ locals, request }, params, handler);
}
