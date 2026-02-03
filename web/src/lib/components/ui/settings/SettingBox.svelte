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
        {#if disclaimer}
            <small class="disclaimer">{disclaimer}</small>
        {/if}
    </div>
</div>

<style lang="scss">
    .setting_container {
        border-radius: .5rem;
        padding: .5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .info {
            h2 {
                font-weight: 600;
            }

            p {
                opacity: .8;
            }
        }

        @media (max-width: 500px) {
			flex-direction: column;
            align-items: start;


		}
    }

    .input_area{
        flex-grow: 1;
        max-width: 500px;

        small {
            color: var(--error-700);
            opacity: .7;
        }

        @media (max-width: 500px) {
            max-width: 100%;
            width: 100%;
		}
    }
</style>