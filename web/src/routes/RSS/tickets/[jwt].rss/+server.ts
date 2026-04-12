import { map_err } from '$lib/error_helper.js';
import { json_fetch } from '$lib/server/api.js';
import { return_sveltekit_http_err } from '$lib/server/api_helper.js';
import { parse_jwt_safe } from '$lib/server/jwt.js';
import { check_ratelimit_safe } from '$lib/server/ratelimit.js';
import { ZRssTicketJWT, type RSSTicketJWT } from '$lib/types/internal_api.js';
import { ZTicketListData, type TicketListData } from '@watcher/shared';
import z from 'zod';

function escape_xml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function create_item(data: TicketListData, host: string): string {
	return `
	<item>
		<title>${escape_xml(data.name)}</title>
		<link>${host}/tickets/${data.ticket_id}</link>
		<guid isPermaLink="false">${data.ticket_id}</guid>
		<pubDate>${data.created_at.toUTCString()}</pubDate>
		<description>Ticket is ${data.status} | Owner is ${data.owner}</description>
		<category>${data.status}</category>
	</item>
	`;
}

function create_rss(data: TicketListData[], host: string, jwt: RSSTicketJWT): string {
	return `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>${escape_xml(jwt.feed_name)}</title><link>${host}</link><description>Your Thread-Watcher ticket feed</description>${data.map((i) => create_item(i, host)).join('\n')}</channel></rss>`;
}

function get_direct_host(host: string) {
	if (host.includes('localhost')) return `http://${host}`;
	else return `https://${host}`;
}

export async function GET({ params, url }) {
	const data = parse_jwt_safe(params.jwt, ZRssTicketJWT);
	if (data.isErr()) return return_sveltekit_http_err(map_err(data.error));
	const ratelimit_res = await check_ratelimit_safe([data.value.uid, 'query_tickets'], 5, 5);
	if (ratelimit_res.isErr()) return return_sveltekit_http_err(ratelimit_res.error);

	const { guild_id, uid, ...rest } = data.value;

	const url_params = new URLSearchParams();
	url_params.set('guild_id', guild_id);

	for (const [f_name, f_val] of Object.entries(rest)) {
		if (!f_val) continue;
		url_params.set(f_name, f_val.toString());
	}

	const tickets = await json_fetch(
		`/tickets?${url_params.toString()}`,
		{ user_id: uid },
		z.array(ZTicketListData)
	);
	if (tickets.isErr()) throw tickets.error;

	const rss = create_rss(tickets.value, get_direct_host(url.host), data.value);

	return new Response(rss.trim(), {
		headers: {
			'Content-Type': 'text/xml; charset=utf-8'
		}
	});
}
