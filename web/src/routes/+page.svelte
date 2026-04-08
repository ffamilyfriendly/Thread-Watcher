<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Discord from '$lib/assets/discord.svg';
	import Banner from '$lib/assets/tw_banner.png';
	import { Github, LayoutPanelLeft, Spool } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import TwLogoBranding from '$lib/components/ui/TwLogoBranding.svelte';

	const { data }: PageProps = $props();

	function load_dash() {
		return goto(`/dashboard`);
	}

	function format_number(n: number): string {
		if (n / 1_000_000 > 1) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n / 1000 > 1) return `${(n / 1000).toFixed(1)}K`;
		return n.toString();
	}

	const guild_count = $derived(data.stats.guild_count);
	const thread_count = $derived(data.stats.watched_threads_count);
	const panel_count = $derived(data.stats.ticket_panels_count);
</script>

<svelte:head>
	<title>Thread-Watcher | The Toolbox for Discord Threads</title>
	<meta name="title" content="Thread-Watcher | The Toolbox for Discord Threads" />
	<meta
		name="description"
		content="Stop fighting Discord's auto-archive. Keep threads alive forever, manage support tickets with AI, and organize your community with the most powerful open-source thread bot."
	/>
	<meta
		name="keywords"
		content="discord bot, discord threads, keep threads open, thread watcher, discord auto-archive fix, discord ticket bot, open source discord bot"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://threadwatcher.xyz/" />
	<meta property="og:title" content="Thread-Watcher | The Toolbox for Discord Threads" />
	<meta
		property="og:description"
		content="Trusted by {format_number(
			guild_count
		)} servers to keep conversations alive and support organized."
	/>
	<meta property="og:image" content={Banner} />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content="https://threadwatcher.xyz/" />
	<meta property="twitter:title" content="Thread-Watcher | The Toolbox for Discord Threads" />
	<meta
		property="twitter:description"
		content="The industry standard for Discord thread management. AI summaries, ticket flows, and persistent threads."
	/>
	<meta property="twitter:image" content={Banner} />

	<meta name="theme-color" content="#7289da" />
</svelte:head>

<div class="nav">
	<TwLogoBranding />

	<div>
		<Button size="large" load_with={load_dash}>Dashboard</Button>
		<Button size="large" variant="tetriary" href="https://botsuite.co/join">Support</Button>
	</div>
</div>

<div
	class="hero_wrapper"
	style="background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url({Banner});"
>
	<section class="hero">
		<h1>The Toolbox for Discord Threads.</h1>
		<p>
			Stop fighting Discord's auto-archive. Thread-Watcher keeps your conversations alive, your
			support tickets organised, and your community running smoothly — all in one bot.
		</p>
		<div class="btns">
			<Button size="large" load_with={load_dash}>Add Bot</Button>
			<Button size="large" href="#features" variant="tetriary">View Features</Button>
		</div>
	</section>
</div>

<section class="stats">
	<div>
		<img class="discord_logo" src={Discord} alt="discord logo" />
		<p><span>{format_number(guild_count)}</span> servers</p>
	</div>
	<div>
		<Spool />
		<p><span>{format_number(thread_count)}</span> watched threads</p>
	</div>
	<div>
		<LayoutPanelLeft />
		<p><span>{format_number(panel_count)}</span> ticket panels</p>
	</div>
</section>

<section id="features" class="features">
	<div class="feature">
		<div>
			<h2>Never Lose a Discord Thread Again</h2>
			<p>
				Discord archives inactive threads whether you like it or not. Thread-Watcher fights back —
				watch individual threads or entire channels at once with /batch, and keep conversations
				alive indefinitely with no limits on how many you can monitor.
			</p>
		</div>
	</div>

	<div class="feature">
		<div>
			<h2>Support Tickets, Your Way</h2>
			<p>
				Build custom ticket flows with a visual pipeline editor. Ask questions, assign roles, route
				tickets to the right channel, and let AI narrow down issues before staff ever get involved.
				More customizable than any other ticket bot — without the complexity.
			</p>
		</div>
	</div>

	<div class="feature">
		<div>
			<h2>Always Getting Better</h2>
			<p>
				Thread-Watcher is actively developed and continuously expanding. New thread management
				tools, deeper integrations, and quality-of-life improvements ship regularly — so your
				community gets more without lifting a finger.
			</p>
		</div>
		<img src={Banner} alt="img" />
	</div>

	<div class="feature">
		<div>
			<h2>Fully Open Source</h2>
			<p>
				Thread-Watcher is built in the open under the permissive MIT license. Audit the code,
				self-host it, or contribute — the community is welcome to shape its future.
			</p>
			<Button href="https://github.com/ffamilyfriendly/Thread-Watcher"><Github /> Github</Button>
		</div>
	</div>
</section>

<div class="cta_wrapper">
	<section class="cta">
		<h2>Let's get your Discord threads organized!</h2>
		<Button size="larger" load_with={load_dash}>
			<img class="discord_logo" src={Discord} alt="discord logo" />
			Add Bot
		</Button>
	</section>
</div>

<style lang="scss">
	:root {
		--content-width: 1200px;
		--side-padding: clamp(1.5rem, 5vw, 4rem);
	}

	.stats {
		display: flex;
		gap: 1rem;
		transform: translateY(-25%);

		@media (max-width: 500px) {
			transform: unset;
			margin-top: 1rem;
		}

		--accent: var(--primary-500);

		div {
			background-color: var(--background-600);
			border: 1px solid var(--background-900);
			padding: 0.5rem 1rem;
			border-radius: 0.25rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			@media (max-width: 500px) {
				flex-direction: column;
				align-items: start;
			}
		}
	}

	.btns {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.discord_logo {
		height: 24px;
		filter: brightness(0) invert(1);
	}

	.nav {
		background-color: var(--background-500);
		border-bottom: 1px solid var(--background-800);
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	section {
		width: 100%;
		max-width: var(--content-width);
		margin-left: auto;
		margin-right: auto;
		padding-left: var(--side-padding);
		padding-right: var(--side-padding);
	}

	.hero_wrapper {
		background-position: center;
		background-size: cover;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 4rem;
	}

	.hero {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 40vh;

		h1 {
			font-size: 4rem;
			max-width: 15ch;
		}

		p {
			max-width: 40ch;
			opacity: 0.8;
		}

		@media (max-width: 500px) {
			min-height: 30vh;
			h1 {
				font-size: 2rem;
			}
		}
	}

	.features {
		margin-top: 2rem;
		margin-bottom: 100px;
		display: flex;
		flex-direction: column;
		gap: 4rem;
	}

	.feature {
		display: flex;
		justify-content: space-between;

		&:nth-child(2n) {
			flex-direction: row-reverse;
		}

		@media (max-width: 1000px) {
			flex-direction: column-reverse !important;
			gap: 0.75rem;
		}

		img {
			width: 45ch;
			border-radius: 1rem;
			box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
		}

		div {
			p {
				margin-bottom: 1rem;
				max-width: 45ch;
			}
		}
	}

	.cta_wrapper {
		background-color: color-mix(in srgb, var(--primary-500), transparent);
		border-top: 1px solid var(--primary-500);
		padding-top: 3rem;
		padding-bottom: 3rem;
		margin-top: 2rem;
	}

	.cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}
</style>
