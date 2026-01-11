<script lang="ts">
	import type { Snippet } from "svelte";

    interface Props {
        name: string,
        description: string,
        disclaimer?: string
        children: Snippet
    }

    const { name, description, children, disclaimer }: Props = $props()
</script>

<div class="setting_container">
    <div class="info">
        <h2>{name}</h2>
        <p>{description}</p>
    </div>
    <div class="input_area">
        {@render children()}
    </div>
    {#if disclaimer}
        <small class="disclaimer">{disclaimer}</small>
    {/if}
</div>

<style lang="scss">
    .setting_container {
        outline: 1px solid rgba(128, 128, 128, 0.33);
        border-radius: .5rem;
        padding: .5rem;
    }
</style>