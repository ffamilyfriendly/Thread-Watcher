<script lang="ts">
	import { ChevronDown, ChevronUp } from '@lucide/svelte';
	import type { PipelineModule } from '@watcher/shared';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import PermissionsSection from './components/PermissionsSection.svelte';

	interface Props {
		module: PipelineModule;
		children: Snippet;
		title: string;
		description: Snippet;
		accent: `#${string}`;
	}

	let { module = $bindable(), children, accent, title, description }: Props = $props();

	function on_input(e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\s/g, '_').replace(/[^\w]/g, '').slice(0, 20);

		module.id = val;
	}

	let expanded = $state(false);
</script>

<div class="wrapper">
	<div style="--accent: {accent}" class="module {expanded ? '' : 'hidden'}">
		{#if expanded}
			<div transition:slide={{ duration: 300 }} class="expansion_wrapper">
				<div class="head">
					<div class="meta">
						<h3 class="space-grotesk">{title}</h3>
						<p class="description">
							{@render description()}
						</p>
					</div>

					<PermissionsSection bind:module />
				</div>

				<div class="content">
					{@render children()}
				</div>

				<div class="footer">
					<div class="fella">
						<p class="jetbrains-mono">ID</p>
						<input
							class="jetbrains-mono"
							bind:value={module.id}
							oninput={on_input}
							spellcheck="false"
							pattern="\w+"
							maxlength="20"
						/>
					</div>
				</div>
			</div>
		{:else}
			<div transition:slide={{ duration: 300 }}>
				<p class="space-grotesk">{title}</p>
				<small class="jetbrains-mono">{module.id}</small>
			</div>
		{/if}
	</div>
	<button class="expand" onclick={() => (expanded = !expanded)}>
		{#if expanded}
			<ChevronUp />
		{:else}
			<ChevronDown />
		{/if}
	</button>
</div>

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: #121212;
	}

	.wrapper {
		display: flex;
		width: 100%;
		gap: 1rem;
		align-items: start;
	}

	.expand {
		background-color: transparent;
		color: white;
		border: none;
	}

	.module {
		position: relative;
		flex-grow: 1;
		background-color: color-mix(in srgb, var(--clr) 95%, white);
		border-left: 3px solid var(--accent);
		outline: 2px solid rgba(255, 255, 255, 0.09);

		border-radius: 0.1rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

		&.hidden {
			padding: var(--padding);
			border-radius: 0.1rem;

			small {
				opacity: 0.4;
			}
		}

		.content {
			padding: var(--padding);
		}

		.footer {
			border-top: 1px solid color-mix(in srgb, var(--clr) 80%, white);
			background-color: color-mix(in srgb, var(--clr) 90%, white);
			padding: 0.5rem var(--padding);
		}

		.head {
			border-bottom: 1px solid color-mix(in srgb, var(--clr) 80%, white);
			background-color: color-mix(in srgb, var(--clr) 90%, white);
			padding: 0.5rem var(--padding);
			display: flex;
			gap: 1rem;
			justify-content: space-between;
			align-items: start;

			.meta {
				max-width: 45ch;
				background-color: color-mix(in srgb, var(--clr) 95%, var(--accent));
				border: 2px solid color-mix(in srgb, var(--clr) 80%, var(--accent));
				padding: 0.5rem;

				p {
					opacity: 0.7;
				}
			}
		}
	}

	.fella {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		outline: 2px solid color-mix(in srgb, var(--clr) 80%, white);

		p {
			background-color: color-mix(in srgb, var(--clr) 80%, white);
			padding: 0.15rem;
		}

		input {
			background-color: transparent;
			color: inherit;
			opacity: 0.9;
			border: none;
			padding: 0.15rem;
		}
	}
</style>
