<script lang="ts">
	import {
		DISCORD_MAX_LABELS_IN_MODAL,
		ZModalChannelSelect,
		ZModalFileUpload,
		ZModalMentionableSelect,
		ZModalRoleSelect,
		ZModalStringSelect,
		ZModalTextInput,
		ZModalUserSelect,
		type ModalComponent,
		type TypedPipelineModule
	} from '@watcher/shared';
	import BaseModule from '../BaseModule.svelte';
	import Toggle from '../../../Toggle.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import IDSelector from '../components/IDSelector.svelte';
	import { Trash2 } from '@lucide/svelte';
	import { get_typed_component, LABEL_COMPONENTS } from './configurators/configurator_registry';
	import EditableAttribute from '../../EditableAttribute.svelte';
	import { s_tooltip, tooltip } from '$lib/client/attachments/tooltip';
	import style from '$lib/style/pipeline.module.scss';

	const guild_state = use_guild_state();

	interface Props {
		module: TypedPipelineModule<'MODAL_QUESTION'>;
	}
	let { module = $bindable() }: Props = $props();

	function new_component(select_type: ModalComponent['type']) {
		switch (select_type) {
			case 'ROLE_SELECT':
				return ZModalRoleSelect.parse({});
			case 'USER_SELECT':
				return ZModalUserSelect.parse({});
			case 'MENTIONABLE_SELECT':
				return ZModalMentionableSelect.parse({});
			case 'CHANNEL_SELECT':
				return ZModalChannelSelect.parse({});
			case 'TEXT_INPUT':
				return ZModalTextInput.parse({});
			case 'STRING_SELECT':
				return ZModalStringSelect.parse({});
			case 'FILE_UPLOAD':
				return ZModalFileUpload.parse({});
		}
	}

	const buttons: { label: string; type: ModalComponent['type'] }[] = [
		{
			label: 'String Select',
			type: 'STRING_SELECT'
		},
		{
			label: 'Text Input',
			type: 'TEXT_INPUT'
		},
		{
			label: 'Channel Select',
			type: 'CHANNEL_SELECT'
		},
		{
			label: 'Mentionable Select',
			type: 'MENTIONABLE_SELECT'
		},
		{
			label: 'User Select',
			type: 'USER_SELECT'
		},
		{
			label: 'Role Select',
			type: 'ROLE_SELECT'
		},
		{
			label: 'File Select',
			type: 'FILE_UPLOAD'
		}
	];

	const can_add_more_labels = $derived(module.labels.length < DISCORD_MAX_LABELS_IN_MODAL);
</script>

<BaseModule title="Question" bind:module>
	{#snippet description()}
		Ask the user questions
	{/snippet}

	<div class="labels-grid">
		{#each module.labels as label, index (label.uid)}
			{@const Comp = get_typed_component(label.component.type)}
			<div class="grid-row">
				<div class="col-delete">
					<button
						class="delete-btn"
						onclick={() => (module.labels = module.labels.filter((l) => l.uid != label.uid))}
						title="Remove Label"
					>
						<Trash2 size={18} />
					</button>
				</div>

				<div class="col-info">
					<div class="attribute-group">
						<EditableAttribute bind:value={label.label}>
							{#snippet display(v)}
								<span class="label-text">{v || 'Click to set label...'}</span>
							{/snippet}
						</EditableAttribute>

						<EditableAttribute bind:value={label.description}>
							{#snippet display(v)}
								<span class="description-text">{v || 'Add description...'}</span>
							{/snippet}
						</EditableAttribute>
					</div>
					<IDSelector bind:id={label.component.custom_id} max_len={100} />
				</div>

				<div
					{@attach s_tooltip('Wheter or not this component requires an answer')}
					class="col-required"
				>
					<Toggle bind:value={label.component.required} />
				</div>

				<div class="col-component">
					<div class="component-wrapper">
						<Comp bind:data={module.labels[index].component} this_uid={module.uid} />
					</div>
				</div>
			</div>
		{/each}
	</div>
	<div class="buttons" class:disabled={!can_add_more_labels}>
		{#each buttons as btn}
			<button
				class={[style.basic_btn]}
				onclick={() =>
					module.labels.push({
						label: btn.label,
						uid: crypto.randomUUID(),
						description: 'description',
						component: new_component(btn.type)
					})}
			>
				+ {btn.label}
			</button>
		{/each}
	</div>
	{#if !can_add_more_labels}
		<p class="warning">You can only have {DISCORD_MAX_LABELS_IN_MODAL} labels in a modal</p>
	{/if}
</BaseModule>

<style lang="scss">
	.buttons {
		display: grid;
		grid-template-columns: repeat(auto-fill, 20ch);
		gap: 0.5rem;
		width: 100%;
	}

	.disabled {
		pointer-events: none;
		opacity: 0.25;
	}

	.warning {
		margin-top: 0.5rem;
		color: var(--error-500);
	}

	.labels-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
		max-width: 100%;
	}

	.grid-row {
		display: grid;
		grid-template-columns: 20px 1fr 30px 400px;
		gap: 1.5rem;
		align-items: center;
		padding: 0.75rem 1rem;
	}

	.grid-row {
		border-radius: 8px;
		border: 1px solid transparent;
		transition: border-color 0.2s;

		&:hover {
			background-color: color-mix(in srgb, var(--clr) 90%, white);
		}
	}

	.attribute-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.5rem;

		.label-text {
			font-weight: 600;
			font-size: 0.95rem;
		}
		.description-text {
			font-size: 0.85rem;
		}
	}

	.col-delete {
		display: flex;
		justify-content: center;

		.delete-btn {
			background: none;
			border: none;
			color: var(--error-500);
			cursor: pointer;
			padding: 4px;
			border-radius: 4px;

			&:hover {
				color: var(--error-700);
			}
		}
	}

	.col-required {
		display: flex;
		justify-content: center;
	}

	.component-wrapper {
		padding: 0.5rem;
		border-radius: 6px;
	}
</style>
