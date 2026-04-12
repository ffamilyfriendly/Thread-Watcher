import { JWT_SECRET } from '$env/static/private';
import { with_schema_auth } from '$lib/server/api_helper';
import ensure_session from '$lib/server/ensure_session';
import { ZRSSTicketCreate } from '$lib/types/internal_api.js';
import jwt from 'jsonwebtoken';
import { ok } from 'neverthrow';

function get_direct_host(host: string) {
	if (host.includes('localhost')) return `http://${host}`;
	else return `https://${host}`;
}

export async function POST(event) {
	return with_schema_auth(event, ZRSSTicketCreate, async (data, user_id) => {
		const { exp, ...rest } = data;
		const jwt_created = jwt.sign({ ...rest, uid: user_id }, JWT_SECRET, { expiresIn: exp });

		const direct_link = `${get_direct_host(event.url.host)}/RSS/tickets/${jwt_created}.rss`;

		return ok({ sub_url: direct_link });
	});
}
