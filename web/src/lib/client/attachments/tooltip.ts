import type { Attachment } from 'svelte/attachments';
import tippy, { followCursor, type Props } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/material.css';
import './tippytheme.css';

const DEFAULT_TOOLTIP_VARIABLES: Partial<Props> = {
	theme: 'material',
	plugins: [followCursor]
};

export function tooltip(props?: Partial<Props> | undefined): Attachment {
	const props_fr_this_time = { ...DEFAULT_TOOLTIP_VARIABLES, ...props };

	return (element) => {
		const tooltip = tippy(element, props_fr_this_time);
		return tooltip.destroy;
	};
}

export const s_tooltip = (content: string) => tooltip({ content, theme: 'material' });
