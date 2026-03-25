<script lang="ts">
	import ChatContainer from '$lib/components/transcript/chat/ChatContainer.svelte';
	import Summaries from '$lib/components/transcript/summaries/summaries.svelte';
	import NavbarV2 from '$lib/components/ui/NavbarV2.svelte';
	import { init_guild_state } from '$lib/stores/guild.svelte';
	import { init_ticket_state } from '$lib/stores/ticket.svelte.js';
	import btn_style from '$lib/style/button.module.scss';
	import { File, Menu } from '@lucide/svelte';
	import common from '$lib/style/common.module.scss';
	import ModNotes from '$lib/components/transcript/mod_notes/ModNotes.svelte';

	const { data } = $props();

	// svelte-ignore state_referenced_locally
	const gs = init_guild_state(data.ticket.guild_id);

	// svelte-ignore state_referenced_locally
	const ts = init_ticket_state(data.ticket, gs);

	const logs_stale = $derived.by(() => {
		const time_elapsed = Date.now() - data.ticket.created_at.getTime();
		const week_as_ms = 1000 * 60 * 60 * 24 * 7;
		return time_elapsed > week_as_ms;
	});
	const pipeline_logs_location = $derived(
		`https://cdn.threadwatcher.xyz/logs/${data.ticket.ticket_id}_pipeline.txt`
	);

	const status = $derived.by(() => {
		switch (data.ticket.status) {
			case 'OPEN':
				return { colour: 'var(--success-500)', text: 'Open' };
			case 'CLOSED':
				return { colour: 'var(--error-500)', text: 'Closed' };
		}
	});

	$effect(() => {
		document.documentElement.style.overflow = 'hidden';
		return () => {
			document.documentElement.style.overflow = '';
		};
	});

	let viewport_width = $state(0);

	const show_overlay = $derived(viewport_width < 1000);
	let navbar_extended = $state(true);
</script>

<svelte:window bind:innerWidth={viewport_width} />

{#if show_overlay && !navbar_extended}
	<button class="expand_button floating" onclick={() => (navbar_extended = true)}>
		<Menu />
	</button>
{/if}

<main>
	<ChatContainer />

	<NavbarV2 bind:is_expanded={navbar_extended} overlay={show_overlay} direction="right">
		{#if show_overlay}
			<button class="expand_button" onclick={() => (navbar_extended = false)}>
				<Menu />
			</button>
		{/if}

		<div class="ticket_name">
			<div class={[common.row, common.space_between]}>
				<h2 class="ticket_name_actual_name">{data.ticket.name}</h2>
				<div class="badge" style="--clr: {status.colour}">
					<div class="circle"></div>
					{status.text}
				</div>
			</div>

			<button class={[btn_style.button, btn_style.primary]}>Resolve</button>
		</div>

		<hr />

		{#if data.ticket.summaries.length > 0}
			<h3 class="heading">Summaries</h3>
			<Summaries />
		{/if}

		<h3 class="heading">Mod Notes</h3>
		<ModNotes />

		<div>
			<a
				target="_blank"
				href={pipeline_logs_location}
				class={[btn_style.button, btn_style.primary, logs_stale ? btn_style.disabled : '']}
			>
				<File />
				Logs
			</a>
			<a
				target="_blank"
				href={pipeline_logs_location}
				class={[btn_style.button, btn_style.primary, logs_stale ? btn_style.disabled : '']}
			>
				<File />
				Panel
			</a>
		</div>
	</NavbarV2>
</main>

<style lang="scss">
	hr {
		margin-top: 1rem;
		margin-bottom: 1rem;
		opacity: 0.3;
	}

	main {
		display: flex;
		height: 100vh;
	}

	.heading {
		opacity: 0.7;
		margin-bottom: 0.5rem;
		margin-top: 1rem;
	}

	.ticket_name {
		background-color: rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.ticket_name_actual_name {
		flex-shrink: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge {
		flex-shrink: 0;
		--theme_clr: var(--clr, green);
		display: inline-flex;
		padding: 0.1rem 0.5rem;
		border-radius: 0.5rem;
		align-items: center;
		gap: 0.25rem;

		background-color: color-mix(in srgb, var(--theme_clr) 10%, transparent);
		color: color-mix(in srgb, var(--theme_clr) 10%, white);
		outline: 1px solid color-mix(in srgb, var(--theme_clr) 50%, transparent);

		.circle {
			height: 1vh;
			width: 1vh;
			border-radius: 50%;
			background-color: var(--theme_clr);
		}
	}

	.expand_button {
		background-color: #131313;
		color: white;
		border: none;
		padding: 0.5rem;
		margin: 0.5rem 0.1rem;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, #121212 90%, white);

		&.floating {
			position: absolute;
			top: 0;
			right: 0;
			margin: 1rem;
			z-index: 200;
		}
	}
</style>
