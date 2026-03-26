import {
	computePosition,
	flip,
	shift,
	offset,
	autoUpdate,
	type Placement,
	type Middleware
} from '@floating-ui/dom';
import type { Attachment } from 'svelte/attachments';
const portal_id = 'TW_DASH_PORTAL_ELEMENT';

function create_portal(): HTMLDivElement {
	const d = document.createElement('div');
	d.id = portal_id;

	document.body.append(d);

	return d;
}

function ensure_portal(): HTMLDivElement {
	let portal_parent = document.getElementById(portal_id);
	if (!portal_parent) portal_parent = create_portal();
	if (!(portal_parent instanceof HTMLDivElement)) {
		portal_parent.remove();
		return create_portal();
	}

	return portal_parent;
}

export function portal(
	anchor_element: HTMLElement,
	options?: {
		force_anchor_width?: boolean;
		placement?: Placement;
		middleware?: Middleware[];
	}
): Attachment {
	const portal_parent = ensure_portal();
	return (node) => {
		if (!(node instanceof HTMLElement)) throw new Error('shi broken');
		portal_parent.appendChild(node);

		Object.assign(node.style, {
			position: 'absolute',
			top: '0',
			left: '0',
			width: 'max-content',
			zIndex: '10000',
			pointerEvents: 'auto'
		});

		const cleanup = autoUpdate(anchor_element, node, async () => {
			const { x, y } = await computePosition(anchor_element, node, {
				placement: options?.placement ?? 'bottom-start',
				middleware: options?.middleware ?? [offset(8), flip(), shift({ padding: 5 })]
			});

			Object.assign(node.style, {
				left: `${x}px`,
				top: `${y}px`
			});

			if (options?.force_anchor_width) {
				node.style.width = `${anchor_element.offsetWidth}px`;
			}
		});

		return () => {
			cleanup();
			node.parentNode?.removeChild(node);
		};
	};
}

export function modal_portal(): Attachment {
	return (node) => {
		if (!(node instanceof HTMLElement)) throw new Error('portal node must be an HTMLElement');
		const portal_parent = ensure_portal();
		Object.assign(portal_parent.style, {
			position: 'fixed',
			inset: '0',
			width: '0',
			height: '0',
			overflow: 'visible',
			pointerEvents: 'none',
			zIndex: '5000'
		});

		node.style.pointerEvents = 'auto';
		portal_parent.appendChild(node);
		return () => node.parentNode?.removeChild(node);
	};
}
