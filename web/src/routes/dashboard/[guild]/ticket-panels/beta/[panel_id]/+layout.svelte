<script lang="ts">
	import { page } from '$app/state';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { init_pipeline_state } from '$lib/stores/pipeline.svelte';
	import { GitBranch, LayoutPanelLeft, Rocket, type IconProps } from '@lucide/svelte';
	import type { Component } from 'svelte';

	let { children, data } = $props();

	const nav_items: { segment: string; label: string; Icon: Component<IconProps, {}, ''> }[] = [
		{ segment: 'panel', label: 'Panel', Icon: LayoutPanelLeft },
		{ segment: 'flow', label: 'Flow', Icon: GitBranch },
		{ segment: 'deploy', label: 'Deploy', Icon: Rocket }
	];

	const current_segment = $derived(page.url.pathname.split('/').filter(Boolean).pop());

	const guild_state = use_guild_state();
	let pipeline_state = $state(init_pipeline_state(guild_state.guild_id_throws, data.panel));
</script>

<nav class="tabnav">
	{#each nav_items as item (item.segment)}
		{@const Icon = item.Icon}
		<a href="./{item.segment}" class:active={current_segment === item.segment}>
			<Icon />
			<span>{item.label}</span>
		</a>
	{/each}
</nav>

{@render children()}

<style lang="scss">
	.tabnav {
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		padding: 0 0.5rem;
		border-bottom: 1px solid var(--primary-800, #2a2a35);
		margin-bottom: 2rem;

		a {
			position: relative;
			display: flex;
			align-items: center;
			gap: 0.4rem;
			padding: 0.65rem 0.85rem;
			text-decoration: none;
			color: var(--text-muted, #8b8b96);
			font-size: 0.9rem;
			font-weight: 500;
			letter-spacing: 0.01em;
			transition: color 0.15s ease;

			&::after {
				content: '';
				position: absolute;
				left: 0.5rem;
				right: 0.5rem;
				bottom: -1px;
				height: 2px;
				background: var(--accent, #6366f1);
				border-radius: 2px;
				transform: scaleX(0);
				transform-origin: center;
				transition:
					transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
					opacity 0.2s ease;
				opacity: 0;
			}

			&:hover {
				color: var(--text, #e4e4e9);
			}

			&.active {
				color: var(--text, #f4f4f7);
				font-weight: 600;

				&::after {
					transform: scaleX(1);
					opacity: 1;
				}
			}
		}
	}
</style>
