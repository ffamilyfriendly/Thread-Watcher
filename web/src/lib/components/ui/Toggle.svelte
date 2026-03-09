<script lang="ts">
	interface Props {
		value?: boolean | null;
		width?: `${number}px` | `${number}rem`;
		height?: `${number}px` | `${number}rem`;
		class_name?: string
	}

	let { value = $bindable(), width, height, class_name }: Props = $props();
</script>

<div style:width style:height class={["outer", class_name]}>
	<div class:activated={value} class="inner">
		<button aria-label="toggle knob" onclick={() => (value = !value)} class="knob"></button>
	</div>
</div>

<style lang="scss">
	.outer {
		width: 40px;
		height: 1rem;
		overflow: hidden;
		border-radius: 5rem;
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		outline: 1px solid var(--primary-500);
	}

	.inner {
		height: 100%;
		background: linear-gradient(90deg, var(--success-100) 20%, var(--success-500) 60%);
		width: 0%;
		transition: width 0.25s ease-in-out;

		&.activated {
			width: 100%;
		}

		.knob {
			cursor: pointer;
			display: block;
			border: none;
			height: 100%;
			aspect-ratio: 1/1;
			margin-left: auto;
			background-color: rgba(255, 255, 255, 0.8);
			border: 1px solid rgba(255, 255, 255, 0.2);
			border-radius: 50%;
		}
	}
</style>
