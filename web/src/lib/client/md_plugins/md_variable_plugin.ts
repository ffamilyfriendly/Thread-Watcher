import type { Component, SvelteComponent } from 'svelte';
import { visit } from 'unist-util-visit';
import type { UnistNode } from 'svelte-exmarkdown';
import type { Node } from 'unist';
import type { Pluggable } from 'unified';
import MdVariable from '$lib/components/ui/Markdown/MdVariable.svelte';
export type ComponentsMap = Record<string, Component<any>>;
export type Plugin = {
	remarkPlugin?: Pluggable;
	rehypePlugin?: Pluggable;
	renderer?: ComponentsMap;
};

interface TextNode extends Node {
	value: string;
}

function variable_handler(_options: {}) {
	return (tree: Node) => {
		visit(tree, 'text', (node: TextNode, index, parent: any) => {
			const regex = /\{\{(.+?)\}\}/g;
			const value = node.value;
			const nodes = [];
			let lastIndex = 0;
			let match;

			while ((match = regex.exec(value)) !== null) {
				if (match.index > lastIndex) {
					nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
				}

				nodes.push({
					type: 'variable',
					data: {
						hName: 'variable',
						hProperties: { variable_name: match[1] }
					}
				});

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

export const variable_plugin = (options = {}): Plugin => ({
	remarkPlugin: [variable_handler, options],
	renderer: {
		variable: MdVariable
	}
});
