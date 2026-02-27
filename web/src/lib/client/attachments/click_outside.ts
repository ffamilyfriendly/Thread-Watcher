import type { Attachment } from 'svelte/attachments';

export function click_outside(callback: () => void): Attachment {
	return (element) => {
		function handle_click(e: MouseEvent) {
			if (!e.target || !(e.target instanceof Node)) return;
			if (!element.contains(e.target)) callback();
		}

		document.addEventListener('click', handle_click, true);

		return () => {
			document.removeEventListener('click', handle_click, true);
		};
	};
}
