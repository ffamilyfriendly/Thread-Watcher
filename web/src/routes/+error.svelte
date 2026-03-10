<script lang="ts">
	import { page } from '$app/state';

	const dev_details: unknown | undefined = (page.error as any)?.dev_details;

	function dev_details_to_text(dd: unknown) {
		if (typeof dd === 'string') return dd;
		else return JSON.stringify(dd);
	}
</script>

<div class="container">
	{#if dev_details}
		<div class="inner">
			<h1>🤓 Dev Details</h1>

			<p class="dev_details">
				{dev_details_to_text(dev_details)}
			</p>
			<small
				>You should not be able to see this. If you are somehow seeing this, please report it!</small
			>
		</div>
	{/if}

	<div class="inner">
		<h1>Error {page.status}</h1>
		<p class="dev_details">
			{page.error?.message}
		</p>
	</div>
	<a href="https://botsuite.co/join">Join Support Server</a>
</div>

<style lang="scss">
	.container {
		width: 100%;
		height: 90vh;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		gap: 1rem;
	}

	.dev_details {
		background-color: #121212;
		padding: 1rem;
		border-radius: 0.25rem;
	}

	.err_code {
		color: var(--error-500);
	}

	.inner {
		padding: 1rem;
		position: relative;
		background-color: color-mix(in srgb, var(--error-600) 20%, transparent);
		border: 1px solid var(--error-500);
		border-radius: 0.25rem;
		width: min(500px, 70%);
	}
</style>
