<script lang="ts" module>
	import { getContext, setContext, type Snippet } from 'svelte';

	interface TabContext {
		active_tab: string;
		register_tab: (id: string, label: string) => void;
	}

	export function get_tab_context() {
		return getContext<TabContext>('TAB_CONTEXT');
	}
</script>

<script lang="ts">
	let {
		default_tab,
		children,
		active_tab = $bindable(default_tab)
	}: { default_tab: string; children: Snippet; active_tab?: string } = $props();

	let tabs = $state<{ id: string; label: string }[]>([]);

	setContext('TAB_CONTEXT', {
		get active_tab() {
			return active_tab;
		},
		register_tab: (id: string, label: string) => {
			if (!tabs.some((t) => t.id === id)) {
				tabs.push({ id, label });
			}
		}
	});
</script>

<div class="container">
	<nav>
		{#each tabs as tab (tab.id)}
			{@const is_active = active_tab === tab.id}
			<button class:active={is_active} onclick={() => (active_tab = tab.id)}>
				{tab.label}
			</button>
		{/each}
	</nav>
	<main>
		{@render children()}
	</main>
</div>

<style lang="scss">
	.container {
		display: flex;
		border-radius: 0.25rem;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.2);

		nav {
			min-width: 20%;
			background-color: color-mix(in srgb, var(--background-900) 60%, transparent);
			padding: 1rem;
			display: flex;
			flex-direction: column;
		}

		main {
			display: flex;
			justify-content: center;
			align-items: center;
			flex-grow: 1;
		}

		button {
			--circle_sircumferance: 0.3rem;
			--circle_passive: color-mix(in srgb, var(--primary-900) 50%, transparent);
			--circle_active: var(--primary-900);
			padding: 0.5rem;
			border-radius: 0.25rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;
			position: relative;
			background-color: transparent;
			color: inherit;
			border: none;
			text-align: start;
			cursor: pointer;

			&::before {
				content: '';
				width: var(--circle_sircumferance);
				height: var(--circle_sircumferance);
				background-color: var(--circle_passive);
				transition: background-color 0.2s ease;
				border-radius: 50%;
				flex-shrink: 0;
				display: block;
			}

			&.active {
				font-weight: bold;
				background-color: color-mix(in srgb, var(--circle_active) 20%, transparent);
				&::before {
					background-color: var(--circle_active) !important;
					outline: 1px solid color-mix(in srgb, var(--circle_active) 20%, transparent);
				}
			}
		}

		@media screen and (max-width: 800px) {
			flex-direction: column;

			nav {
				padding: 0.5rem 0.1rem;
				border-bottom: 1px solid rgba(255, 255, 255, 0.2);
			}

			main {
				padding: 1rem 0.1rem;
			}
		}
	}
</style>
