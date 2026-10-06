<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { init_pipeline_state } from '$lib/stores/panel.svelte.js';
	import { GitBranch, LayoutPanelLeft, Rocket, type IconProps } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { fly } from 'svelte/transition';

	let { children, data } = $props();

	const nav_items: { segment: string; label: string; Icon: Component<IconProps, {}, ''> }[] = [
		{ segment: 'panel', label: 'Panel', Icon: LayoutPanelLeft },
		{ segment: 'flow', label: 'Flow', Icon: GitBranch },
		{ segment: 'deploy', label: 'Deploy', Icon: Rocket }
	];

	const current_segment = $derived(page.url.pathname.split('/').filter(Boolean).pop());

	const guild_state = use_guild_state();
	let pipeline_state = $state(init_pipeline_state(guild_state.guild_id_throws));

	$effect(() => {
		if (data.panel && !pipeline_state.is_initialized) pipeline_state.init_guild_state(data.panel);
	});

	$effect(() => {
		function handle_before_unload(e: BeforeUnloadEvent) {
			if (pipeline_state.is_dirty()) e.preventDefault();
			return 'hello';
		}

		window.addEventListener('beforeunload', handle_before_unload);
		return () => window.removeEventListener('beforeunload', handle_before_unload);
	});

	beforeNavigate((nav) => {
		if (
			pipeline_state.is_dirty() &&
			!nav.to?.url.pathname.includes(pipeline_state.panel.panel_id)
		) {
			alert("You've unsaved changes. Please either save or undo the changes before navigating :)");
			nav.cancel();
		}
	});

	async function handle_save_changes() {
		return pipeline_state.save().catch(add_toast_from_error)
	}

	function handle_revert_changes() {
		pipeline_state.revert_changes().match((_ok) => {}, add_toast_from_error)
	}
</script>

{#if pipeline_state.is_dirty()}
	<div transition:fly class="save_bar_container">
		<div class="save_bar">
			<p>You've unsaved changes</p>
	
			<Button variant="tetriary" on_click={handle_revert_changes}>Undo</Button>
			<Button variant="primary" load_with={handle_save_changes}>Save</Button>
		</div>
	</div>
{/if}

<nav class="tabnav">
	{#each nav_items as item (item.segment)}
		{@const Icon = item.Icon}
		<a href="./{item.segment}" class:active={current_segment === item.segment}>
			<Icon />
			<span>{item.label}</span>
		</a>
	{/each}
</nav>

<main>
	{#if pipeline_state.is_initialized}
		{@render children()}
	{:else}
		Loading...
	{/if}
</main>

<style lang="scss">
	main {
		overflow: hidden;
	}

	.save_bar_container {
		z-index: 133742069;
		width: 100%;
		background-color: transparent;
		position: fixed;
		display: flex;
		align-items: center;
		justify-content: center;
		bottom: 0;
		left: 0;
		padding-bottom: 1rem;

		.save_bar {
			background-color: color-mix(in srgb, var(--background-500) 95%, white);
			border: 1px solid color-mix(in srgb, var(--background-900) 80%, transparent);
			width: 80%;
			display: grid;
			border-radius: .25rem;
			grid-template-columns: 1fr auto auto;
			gap: 1rem;
			padding: .25rem 1rem;
		}
	}

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
