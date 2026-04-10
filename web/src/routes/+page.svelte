<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Discord from '$lib/assets/discord.svg';
	import Banner from '$lib/assets/tw_banner.png';
	import { Github, LayoutPanelLeft, Spool } from '@lucide/svelte';
	import type { PageProps } from './$types';

	import Feature1 from '$lib/assets/feat_1.webp';
	import Feature2 from '$lib/assets/feat_2.webp';
	import Feature3 from '$lib/assets/feat_3.webp';
	import Feature4 from '$lib/assets/feat_4.webp';
	import NavbarUnauthed from '$lib/components/ui/NavbarUnauthed.svelte';

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

<NavbarUnauthed />

<div
	class="hero_wrapper"
	style="background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url({Banner});"
>
	<section class="hero">
		<h1>The Toolbox for Discord Threads.</h1>
		<p>
			Stop fighting Discord's auto-archive. Thread-Watcher keeps your threads alive, your support
			tickets organized, and your community running smoothly. All in one bot.
		</p>
		<div class="btns">
			<Button size="large" load_with={load_dash}>Add To Discord</Button>
			<Button size="large" href="#features" variant="tetriary">See How It Works</Button>
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
		<p><span>{format_number(thread_count)}</span> Watched Threads</p>
	</div>
	<div>
		<LayoutPanelLeft />
		<p><span>{format_number(panel_count)}</span> Ticket Panels</p>
	</div>
</section>

<section id="features" class="features">
	<div class="feature">
		<div>
			<h2>Never Lose a Discord Thread Again</h2>
			<p>
				Discord quietly hides inactive threads, making conversations disappear when you least expect
				it. Thread-Watcher makes sure that never happens.
			</p>

			<p>
				Watch individual threads, channels, or the whole server at once with <span class="command"
					>/batch</span
				> to keep threads alive indefinitely. No limits and no maintenance. Just threads that stay alive
				for as long as you need them.
			</p>
		</div>
		<enhanced:img
			src={Feature1}
			alt="Thread-Watcher mascot illuminating threads thru beams eminating from his eyes, the center thread elevated and bathing in light indicating it being watched"
		/>
	</div>

	<div class="feature">
		<div>
			<h2>Support Tickets, Your Way</h2>
			<p>
				Build fully custom ticket flows with an intuitive visual editor. Ask questions, assign
				roles, and route the ticket to exactly where it needs to go without writing a single line of
				code. You're in control!
			</p>
			<p>
				All tickets are transcribed for you so you can look back, even if the ticket thread was
				deleted. Get the gist of a ticket at a glance with the <small class="muted"
					>(optional)</small
				> AI ticket summarizer, no back-reading required!
			</p>
			<Button load_with={load_dash}>
				<img class="discord_logo" src={Discord} alt="discord logo" />
				Add Bot
			</Button>
		</div>
		<enhanced:img
			src={Feature2}
			alt="Thread-Watcher mascot illuminating peaking out behind 3 floating images. 2 images showcase ticket panels with the names 'User Reports' and 'Suggestions' with the third image, taking the most space at the front, being a screenshot of a ticket pipeline being configured."
		/>
	</div>

	<div class="feature">
		<div>
			<h2>Always Getting Better</h2>
			<p>
				Thread-Watcher is actively developed and constantly expanding. New thread management tools,
				nifty new ticket modules, and quality-of-life improvements might be worked on at this very
				moment!
			</p>
			<p>
				Want to take a peak behind the curtain to see what's being worked on currently?
				Thread-Watcher has a public roadmap to keep you informed on what's going on.
			</p>

			<Button variant="tetriary" href="https://github.com/users/ffamilyfriendly/projects/4/views/2"
				>Public Roadmap</Button
			>
		</div>
		<enhanced:img
			src={Feature3}
			alt="Thread-Watcher mascot carrying a hammer and wearing a yellow hard hat striking a blue box with the text 'new stuff' written on it. The hammer hitting the box is causing sparks to fly about"
		/>
	</div>

	<div class="feature">
		<div>
			<h2>Fully Open Source</h2>
			<p>
				Thread-Watcher has always been built in the open under the permissive MIT license. This
				means you can take a look under the hood, directly at the code the bot runs on, and modify
				it if you wish.
			</p>
			<p>
				It's our hope that you'll thoroughly enjoy using what we build, but we wholeheartedly
				support you in taking it further. Host it yourself, modify it, or shape it into exactly what
				your community needs.
			</p>
			<Button href="https://github.com/ffamilyfriendly/Thread-Watcher"><Github /> Github</Button>
		</div>
		<enhanced:img
			src={Feature4}
			alt="Thread-Watcher mascot wearing 'nerdy' glasses peaking out from 3 floating segments of code"
		/>
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

	.command {
		color: color-mix(in srgb, var(--premium-900) 80%, white);
	}

	.muted {
		opacity: 0.5;
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

		@media (max-width: 1000px) {
			align-items: center;
		}
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

		& > img {
			width: 45ch;
			border-radius: 1rem;

			@media (max-width: 500px) {
				width: 100%;
			}
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
