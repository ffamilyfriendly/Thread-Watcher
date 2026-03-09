<script lang="ts">
	import { type TypedComponent } from '@watcher/shared';
	import StringSelectConfigurator from '../../../StringSelectConfigurator.svelte';
	import SelectWrapper from './SelectWrapper.svelte';

	interface Props {
		data: TypedComponent<'STRING_SELECT'>;
		this_uid: string;
	}

	let { data = $bindable() }: Props = $props();
</script>

<SelectWrapper bind:data>
	<StringSelectConfigurator bind:placeholder={data.placeholder} bind:options={data.options} />
</SelectWrapper>
