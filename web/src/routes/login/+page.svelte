<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import logo from '$lib/assets/thread_watcher_icon.png';
	import btn_style from '$lib/style/button.module.scss';
</script>

<div id="container">
	<div class="window">
		<div class="logo">
			<img width="24px" src={logo} alt="Thread-Watcher logo" />
			<h2>Login</h2>
		</div>

		<div class="content">
			<button
				class={[btn_style.button, btn_style.primary]}
				on:click={() => signIn('discord', { redirectTo: '/dashboard/' })}
			>
				Sign In With Discord
			</button>
		</div>
	</div>

	<div>
		<a href="/policies/privacy_policy">Privacy Policy</a>
		<a href="/policies/terms_of_service">Terms of Service</a>
	</div>
</div>

<style lang="scss">
	#container {
		display: flex;
		height: 100vh;
		width: 100%;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		flex-direction: column;
	}

	.window {
		outline: 1px solid color-mix(in srgb, var(--primary-500), transparent);
		max-width: 500px;
		min-width: 300px;
		border-radius: 0.5rem;
		--padding: 0.5rem;
	}

	.content {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100px;
		padding: var(--padding);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 1rem;

		background-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--primary-500), transparent);
		padding: var(--padding);
	}
</style>
