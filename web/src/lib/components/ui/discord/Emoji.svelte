<script lang="ts">
	interface Props {
		id?: string | null;
		name?: string | null;
	}

	const { id, name }: Props = $props();
</script>

<span class="emoji">
	{#if id}
		<img src="https://cdn.discordapp.com/emojis/{id}.webp?size=96" alt="Emoji" />
	{:else if name}
		<span>{name}</span>
	{/if}
</span>

<style>
	.emoji {
		display: inline-block;
		height: 1rem;
		width: 1rem;

		img,
		span {
			width: 100%;
			height: 100%;
		}
	}
</style>
