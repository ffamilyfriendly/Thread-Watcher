import type { Component } from 'svelte';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import type { Pluggable } from 'unified';
import MdDiscordUserTag from '$lib/components/ui/Markdown/MdDiscordUserTag.svelte';
import MdDiscordChannelTag from '$lib/components/ui/Markdown/MdDiscordChannelTag.svelte';
import Emoji from '$lib/components/ui/discord/Emoji.svelte';
import MdDiscordRoleTag from '$lib/components/ui/Markdown/MdDiscordRoleTag.svelte';
export type ComponentsMap = Record<string, Component<any>>;
export type Plugin = {
	remarkPlugin?: Pluggable;
	rehypePlugin?: Pluggable;
	renderer?: ComponentsMap;
};

interface TextNode extends Node {
	value: string;
}

function rich_tag_handler(_options: {}) {
	return (tree: Node) => {
		visit(tree, 'text', (node: TextNode, index, parent: any) => {
			const regex = /<(@|#|@&|(a|):\w+:)(\d+)>/g;
			const value = node.value;
			const nodes = [];
			let lastIndex = 0;
			let match;

			while ((match = regex.exec(value)) !== null) {
				if (match.index > lastIndex) {
					nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
				}

				// The "type" of rich tag such as "@" for a user ping <@870715447136366662>
				const match_type = match[1];
				// The id of the rich tag such as "870715447136366662" for the example above
				const discord_id = match[3];

				console.log('MATCH', match);

				let obj: {
					type: string;
					data: { hName: string; hProperties: { [index: string]: any } };
				} | null = null;

				if (match_type === '@') {
					obj = {
						type: 'discord_user_tag',
						data: {
							hName: 'discord_user_tag',
							hProperties: { user_id: discord_id }
						}
					};
				} else if (match_type === '@&') {
					obj = {
						type: 'discord_role_tag',
						data: {
							hName: 'discord_role_tag',
							hProperties: { role_id: discord_id }
						}
					};
				} else if (match_type == '#') {
					obj = {
						type: 'discord_channel_tag',
						data: {
							hName: 'discord_channel_tag',
							hProperties: { channel_id: discord_id }
						}
					};
				} else {
					obj = {
						type: 'discord_emoji_tag',
						data: {
							hName: 'discord_emoji_tag',
							hProperties: { id: discord_id, is_animated: match_type.startsWith('a') }
						}
					};
				}

				if (obj) nodes.push(obj);

				lastIndex = regex.lastIndex;
			}

			if (nodes.length > 0) {
				if (lastIndex < value.length) {
					nodes.push({ type: 'text', value: value.slice(lastIndex) });
				}

				parent.children.splice(index, 1, ...nodes);
			}
		});
	};
}

export const discord_plugin = (options = {}): Plugin => ({
	remarkPlugin: [rich_tag_handler, options],
	renderer: {
		discord_user_tag: MdDiscordUserTag,
		discord_channel_tag: MdDiscordChannelTag,
		discord_emoji_tag: Emoji,
		discord_role_tag: MdDiscordRoleTag
	}
});
