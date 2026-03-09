<script lang="ts">
    import common from "$lib/style/common.module.scss"
	import type { Snippet } from "svelte";

    interface Props {
        title: string,
        description: string,
        children: Snippet
    }

    const { title, description, children }: Props = $props()

</script>

<div class={[common.row, common.gap_large, "container"]}>
    <div>
        <h4 class="space-grotesk head">{title}</h4>
        <span class="jetbrains-mono-300 description">{description}</span>
    </div>

    {@render children()}
</div>

<style lang="scss">

    .head {
        padding-bottom: 0;
    }

    .description {
        font-size: small;
    }

    .container {
        margin-top: .5rem;
        margin-bottom: .5rem;
        justify-content: space-between;
    }
</style>