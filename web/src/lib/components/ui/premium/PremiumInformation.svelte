<script lang="ts">
	import { guild_state } from '$lib/stores/guild.svelte';
	import btn_style from '$lib/style/button.module.scss';

	interface Props {
		level: 'BASIC' | 'EXTENDED';
	}

	const { level }: Props = $props();
</script>

{#if level === 'EXTENDED'}
	hi
{:else if level === 'BASIC'}
	<div class="topgg_vote_cta">
		<h5>Power up this server!</h5>
		<p class="text">
			Every vote on Top.gg extends this server's Basic Premium access by <b>12 hours.</b>
		</p>
		<a
			class={[btn_style.button, btn_style.topgg]}
			href="https://top.gg/bot/870715447136366662/vote?guild_id={guild_state.guild_id}"
		>
			Vote
		</a>
		<small class="share_cta"
			>This vote link is tied to this server. Share this exact link if others are voting.</small
		>
	</div>
	basic
{/if}

<div>Generic bullshit about how you help me out or whateves</div>

<style lang="scss">
	.topgg_vote_cta {
		border-radius: 0.5rem;
		padding: 1rem 1rem;
		background-color: color-mix(in srgb, var(--topgg-500) 10%, transparent);
		outline: 1px solid color-mix(in srgb, var(--topgg-500) 25%, transparent);

		h5 {
			color: var(--topgg-200);
		}

		.share_cta {
			opacity: 0.5;
		}
	}

	.text {
		max-width: 45ch;
		margin-top: 0.5rem;
		margin-bottom: 0.7rem;
	}
</style>
