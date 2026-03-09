<script lang="ts">
	import type { TypedComponent } from '@watcher/shared';
	import SelectWrapper from './SelectWrapper.svelte';

	interface Props {
		data: TypedComponent<'FILE_UPLOAD'>;
	}

	let { data = $bindable() }: Props = $props();
</script>

<SelectWrapper bind:data>hi</SelectWrapper>
