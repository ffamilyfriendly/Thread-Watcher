<script lang="ts">
	import { DISCORD_MAX_TEXT_INPUT_LEN, type TypedComponent } from '@watcher/shared';
	import SelectWrapper from './SelectWrapper.svelte';
	import VariableInputSupreme from '../../components/VariableInputSupreme.svelte';
	import style from '$lib/style/pipeline.module.scss';
	import common from '$lib/style/common.module.scss';
	import { portal } from '$lib/client/attachments/portal';

	interface Props {
		data: TypedComponent<'TEXT_INPUT'>;
		this_uid: string;
	}

	let { data = $bindable(), this_uid }: Props = $props();
</script>

<SelectWrapper bind:data max_allowed_values={DISCORD_MAX_TEXT_INPUT_LEN}>
	<div>
		<div class={['grid_row']}>
			<p class="lable">Placeholder</p>
			<VariableInputSupreme
				class={[style.text, 'varinput_max_width']}
				type="text"
				placeholder="Placeholder text"
				bind:value={data.placeholder}
				before_uid={this_uid}
			/>
		</div>
		<div class={['grid_row']}>
			<p class="lable">Value</p>
			<VariableInputSupreme
				class={[style.text, 'varinput_max_width']}
				type="text"
				placeholder="Initial Value"
				bind:value={data.value}
				before_uid={this_uid}
			/>
		</div>
	</div>
</SelectWrapper>

<style>
	.grid_row {
		display: grid;
		grid-template-columns: 1fr 2fr;
	}

	:global(.varinput_max_width) {
		width: 100%;
		display: block;
	}
</style>
