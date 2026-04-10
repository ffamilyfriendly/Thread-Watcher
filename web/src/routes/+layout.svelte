<script lang="ts">
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import TwLogoBranding from '$lib/components/ui/TwLogoBranding.svelte';
	import '$lib/style/app.scss';
	let { children } = $props();
</script>

<ToastContainer />
{@render children()}

<footer>
	<div class="attrib">
		<div class="pill">
			<TwLogoBranding />
		</div>

		<div>
			<div class="dev_shoutout">
				Built with <span class="heart">💖</span> by
				<a href="https://github.com/ffamilyfriendly">John</a> in Uppsala 🇸🇪
			</div>
			<p class="copyright_notice">
				© 2026 Thread-Watcher - A <a href="https://botsuite.co">BotSuite</a> Project. Not affiliated with
				Discord Inc.
			</p>
		</div>
	</div>

	<div class="sections">
		<div class="section">
			<h3>The Bot</h3>
			<ul>
				<li><a href="https://threadwatcher.xyz/invite">Invite</a></li>
				<li><a href="https://botsuite.co/join">Support Server</a></li>
				<li><a href="https://docs.threadwatcher.xyz">Documentation</a></li>
				<li><a href="https://github.com/ffamilyfriendly/Thread-Watcher">Github</a></li>
			</ul>
		</div>
		<div class="section">
			<h3>Legal</h3>
			<ul>
				<li><a href="/policies/privacy-policy">Privacy Policy</a></li>
				<li><a href="/policies/terms-of-service">Terms of Service</a></li>
				<li><a href="/policies/attribution">Attribution</a></li>
				<li><a href="mailto:hello@botsuite.co">Contact</a></li>
			</ul>
		</div>
	</div>
</footer>

<style lang="scss">
	footer {
		background-color: var(--background-600);
		border-top: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
		padding: 1rem;
		display: flex;
		justify-content: space-evenly;

		@media (max-width: 700px) {
			flex-direction: column-reverse;
			gap: 1rem;
		}
	}

	.attrib {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.pill {
		padding: 0.5rem 1rem;
		width: fit-content;
		background-color: var(--background-700);
		border: 1px solid var(--background-900);
		border-radius: 0.25rem;

		@media (max-width: 700px) {
			display: none;
		}
	}

	.sections {
		display: flex;
		margin-bottom: 1rem;
		justify-content: space-between;
		min-width: 300px;

		@media (max-width: 700px) {
			justify-content: unset;
			gap: 1rem;
			align-items: start;
		}
	}

	.section {
		ul {
			list-style: none;

			li a {
				color: inherit;
				opacity: 0.7;
				text-decoration: none;
				transition: 0.2s;

				&:hover {
					color: var(--primary-900);
				}
			}
		}
	}

	.copyright_notice {
		opacity: 0.5;
	}
</style>
