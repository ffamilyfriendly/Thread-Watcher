<script lang="ts">
	interface Props {
		on_move: (idx: number, module_id: string) => void;
		on_create_here: (idx: number, module_type: string) => void;
		idx: number;
	}

	const { on_move, on_create_here, idx }: Props = $props();

	let is_over = $state(false);

	function handle_over(e: DragEvent) {
		e.preventDefault();
		is_over = true;
	}

	function handle_leave(e: DragEvent) {
		is_over = false;
	}

	function handle_drop(e: DragEvent) {
		is_over = false;

		const op_type = e.dataTransfer?.getData('optype');
		const module_id = e.dataTransfer?.getData('module_id');
		const module_type = e.dataTransfer?.getData('module_type');

		if (op_type == 'move' && module_id) {
			on_move(idx, module_id);
		}

		if (op_type == 'create' && module_type) {
			on_create_here(idx, module_type);
		}
	}
</script>

<div
	role="region"
	aria-label="Drop area to insert or reorder module"
	class="dropzone"
	class:active={is_over}
	ondragover={handle_over}
	ondragleave={handle_leave}
	ondrop={handle_drop}
>
	<div class="visual_line"></div>
</div>

<style lang="scss">
	.dropzone {
		height: 10px;
		margin: -5px 0;
		transition: height 0.2s;
		display: flex;
		align-items: center;
		z-index: 10;

		&.active {
			height: 40px;
			.visual_line {
				opacity: 1;
				border-style: solid;
			}
		}
	}

	.visual_line {
		width: 100%;
		height: 2px;
		opacity: 0;
		border: 1px dashed var(--primary-500);
		background: color-mix(in srgb, var(--primary-500) 20%, transparent);
		transition: opacity 0.2s;
	}
</style>
