<script lang="ts">
    interface Props {
        id: string,
        max_len?: number
    }
    let { id = $bindable(), max_len = 20 }: Props = $props()

    function on_input(e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\s/g, '_').replace(/[^\w]/g, '').slice(0, max_len);

		id = val;
	}
</script>

<div class="fella">
    <p class="jetbrains-mono">ID</p>
    <input
        class="jetbrains-mono"
        bind:value={id}
        oninput={on_input}
        spellcheck="false"
        pattern="\w+"
        maxlength={max_len}
    />
</div>

<style lang="scss">
    .fella {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		outline: 2px solid color-mix(in srgb, var(--clr) 80%, white);

		p {
			background-color: color-mix(in srgb, var(--clr) 80%, white);
			padding: 0.15rem;
		}

		input {
			background-color: transparent;
			color: inherit;
			opacity: 0.9;
			border: none;
			padding: 0.15rem;
		}
	}
</style>