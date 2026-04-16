<script lang="ts">
	interface Props {
		guild: { name: string, icon?: string | null, nameAcronym: string, id: string };
	}

	const { guild }: Props = $props();
</script>

<p>
	{#if guild.icon}
		<img
			src="https://cdn.discordapp.com/icons/{guild.id}/{guild.icon}.png"
			alt="Icon of {guild.name}"
			class="img"
		/>
	{:else}
		<span class="img">
			{guild.nameAcronym}
		</span>
	{/if}
	{guild.name}
</p>

<style lang="scss">
	.img {
		height: 1.5rem;
		width: 1.5rem;
		border-radius: 50%;
		background-color: var(--secondary-500);
		font-size: 0.7rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	p {
		--colour: white;
		padding: 0.25rem 0.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 0.2rem;
		font-weight: bold;
		background-color: color-mix(in srgb, var(--colour) 20%, transparent);
		color: var(--colour);
	}
</style>
