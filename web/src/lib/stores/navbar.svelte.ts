import type { Snippet } from 'svelte';
import { type Icon as IconType } from '@lucide/svelte';
import { SvelteMap } from 'svelte/reactivity';

export interface MenuItem {
	name: string;
	href: string;
	icon: typeof IconType;
}

export interface MenuSection {
	name: string;
	base: `/${string}`;
	items: MenuItem[];
}

class NavbarState {
	sections_map = $state(new SvelteMap<string, MenuSection>());
	subpage = $state<Snippet>();
	active_item = $state<number>();

	get menu_items() {
		return this.sections.map((s) => s.items).flat();
	}

	get sections() {
		return Array.from(this.sections_map.values());
	}

	register_section(section_id: string, section: MenuSection) {
		console.log('REGISTERING SECTION', section_id, section);
		this.sections_map.set(section_id, section);

		return () => {
			this.sections_map.delete(section_id);
		};
	}

	register_subpage(info: Snippet) {
		this.subpage = info;
		return () => {
			this.subpage = undefined;
		};
	}
}

export const nav_state = new NavbarState();
