<script lang="ts">
	interface Props {
		id?: string | null;
		name?: string | null;
		is_animated?: boolean;
		size?: number;
	}

	const { id, name, is_animated, size = 96 }: Props = $props();

	const emoji_url = $derived.by(() => {
		let url = `https://cdn.discordapp.com/emojis/${id}.webp?size=${size}`;
		if (is_animated) url += '&animated=true';
		return url;
	});
</script>

<span class="emoji">
	{#if id}
		<img src={emoji_url} alt="Emoji" />
	{:else if name}
		<span>{name}</span>
	{/if}
</span>

<style>
	.emoji {
		display: inline-block;
		vertical-align: text-bottom;
		height: 1rem;
		aspect-ratio: 1/1;

		img,
		span {
			width: 100%;
			height: 100%;
		}
	}
</style>
