<script lang="ts">
	import NavbarV2 from '../NavbarV2.svelte';
	import type { Snippet } from 'svelte';
	import { nav_state, type MenuItem, type MenuSection } from '$lib/stores/navbar.svelte';
	import { page as svelte_page } from '$app/state';
	import {
		ArrowDownRight,
		GitBranch,
		Indent,
		IndentIncrease,
		LucideBowArrow
	} from '@lucide/svelte';

	interface Props {
		overlay: boolean;
		should_be_open: boolean;
		hamburger: Snippet;
	}

	function is_active_link(section: MenuSection, page: MenuItem) {
		const pathname = svelte_page.url.pathname.replace(section.base, '');

		console.log('PATHNAME', pathname);
		console.log('href', page.href);

		if (page.href === '') return pathname === page.href;

		return pathname.startsWith(page.href);
	}

	function get_href_link(section: MenuSection, page: MenuItem) {
		if (page.href.startsWith('http')) return page.href;
		return section.base + page.href;
	}

	let { overlay, should_be_open = $bindable(), hamburger }: Props = $props();
</script>

<NavbarV2 width="250px" {overlay} is_expanded={should_be_open}>
	{@render hamburger()}

	{#each nav_state.sections as section}
		<div class="section">
			<b>{section.name}</b>
			<ul>
				{#each section.items as page}
					{@const is_active = is_active_link(section, page)}
					{@const href_link = get_href_link(section, page)}
					{@const Icon = page.icon}
					<li class:active={is_active}>
						<a href={href_link}
							><Icon />
							<div>
								<span>{page.name}</span>
								{#if is_active && nav_state.subpage}
									<div class="subpage">
										{@render nav_state.subpage()}
									</div>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</NavbarV2>

<style lang="scss">
	.section {
		margin-bottom: 1rem;
		b {
			opacity: 0.4;
		}

		ul {
			list-style: none;

			li a {
				text-decoration: none;
				align-items: center;
				display: flex;
				color: inherit;
				gap: 0.5rem;
				padding: 0.75rem 0.5rem;

				&:hover {
					background-color: color-mix(in srgb, var(--background-600) 95%, white);
				}
			}
		}
	}

	.subpage {
		opacity: 0.7;
	}

	.active {
		border-radius: 0.5rem;
		outline: 1px solid var(--primary-500);
		background-color: color-mix(in srgb, var(--primary-500) 10%, transparent);
	}
</style>
