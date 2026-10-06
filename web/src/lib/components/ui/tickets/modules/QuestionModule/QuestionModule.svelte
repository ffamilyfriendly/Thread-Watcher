<script lang="ts">
	import {
		DISCORD_MAX_LABELS_IN_MODAL,
		ZModalChannelSelect,
		ZModalFileUpload,
		ZModalRoleSelect,
		ZModalStringSelect,
		ZModalTextInput,
		ZModalUserSelect,
		type ModalComponent,
		type TypedPipelineModule
	} from '@watcher/shared';
	import BaseModule from '../BaseModule.svelte';
	import Toggle from '../../../Toggle.svelte';
	import IDSelector from '../components/IDSelector.svelte';
	import {
		AtSign,
		Factory,
		File,
		FormInput,
		Hash,
		ListFilter,
		Paperclip,
		PersonStanding,
		Shield,
		TextCursor,
		TextSelect,
		Trash2,
		User2
	} from '@lucide/svelte';
	import { get_typed_component } from './configurators/configurator_registry';
	import EditableAttribute from '../components/InlineTextEditor.svelte';
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import style from '$lib/style/pipeline.module.scss';
	import Button from '$lib/components/ui/Button.svelte';
	import Explainer from '$lib/components/ui/Explainer.svelte';
	import VariableTextEditor from '../components/VariableTextEditor.svelte';
	import type { Component } from 'svelte';
	import Cheng from '../components/Cheng.svelte';

	interface Props {
		module: TypedPipelineModule<'MODAL_QUESTION'>;
	}
	let { module = $bindable() }: Props = $props();

	function generate_custom_id(select_type: ModalComponent['type']) {
		const label_incramentors_arr = module.labels
			.filter((lbl) => lbl.component.type === select_type)
			.map((lbl) => Number(lbl.component.custom_id.split('_').pop()))
			.filter((n) => !isNaN(n));
		const highest_assigned_id = Math.max(...label_incramentors_arr, 0);

		return `${select_type}_${highest_assigned_id + 1}`;
	}

	function new_component(select_type: ModalComponent['type']) {
		const custom_id = generate_custom_id(select_type);
		switch (select_type) {
			case 'ROLE_SELECT':
				return ZModalRoleSelect.parse({ custom_id });
			case 'USER_SELECT':
				return ZModalUserSelect.parse({ custom_id });
			case 'CHANNEL_SELECT':
				return ZModalChannelSelect.parse({ custom_id });
			case 'TEXT_INPUT':
				return ZModalTextInput.parse({ custom_id });
			case 'STRING_SELECT':
				return ZModalStringSelect.parse({ custom_id });
			case 'FILE_UPLOAD':
				return ZModalFileUpload.parse({ custom_id });
		}
	}

	const ModalComponentTypes: Record<ModalComponent['type'], { label: string; icon: Component }> = {
		STRING_SELECT: {
			label: 'String Select',
			icon: ListFilter
		},
		TEXT_INPUT: {
			label: 'Text Input',
			icon: FormInput
		},
		CHANNEL_SELECT: {
			label: 'Channel Select',
			icon: Hash
		},
		USER_SELECT: {
			label: 'User Select',
			icon: AtSign
		},
		ROLE_SELECT: {
			label: 'Role Select',
			icon: Shield
		},
		FILE_UPLOAD: {
			label: 'File Select',
			icon: Paperclip
		}
	};

	const buttons: { label: string; type: ModalComponent['type']; icon: Component }[] = Object.keys(
		ModalComponentTypes
	).map((key) => ({
		type: key as ModalComponent['type'],
		...ModalComponentTypes[key as ModalComponent['type']]
	}));

	const can_add_more_labels = $derived(module.labels.length < DISCORD_MAX_LABELS_IN_MODAL);
</script>

<BaseModule title="Question" bind:module>
	{#snippet description()}
		Asks the user one or more questions before the ticket is created. Supports free text, dropdowns,
		channel/user/role pickets, and file uploads. Answers are stored as variables and can be
		referenced in later modules
	{/snippet}

	<div class="labels-grid">
		{#each module.labels as label, index (label.uid)}
			{@const Comp = get_typed_component(label.component.type)}
			{@const ComponentMeta = ModalComponentTypes[label.component.type]}
			{@const ComponentIcon = ComponentMeta.icon}

			<div class="editor">
				<div class="head">
					<span> <ComponentIcon size={'1rem'} /> {ComponentMeta.label}</span>

					<div>
						<IDSelector bind:id={label.component.custom_id} max_len={100} />
						<button
							class="delete-btn"
							onclick={() => (module.labels = module.labels.filter((l) => l.uid != label.uid))}
							title="Remove Label"
						>
							<Trash2 size={16} />
						</button>
					</div>
				</div>

				<div class="content">
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

					<Comp bind:data={module.labels[index].component} this_uid={module.uid} />

					<Cheng
						title="Require Answer"
						description="Should the user be forced to answer this component?"
					>
						<Toggle bind:value={label.component.required} />
					</Cheng>
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
	.editor {
		--border_clr: color-mix(in srgb, var(--background-500) 80%, white);
		border: 1px solid var(--border_clr);
		border-radius: 0.25rem;
		overflow: hidden;

		.head {
			display: flex;
			justify-content: space-between;
			align-items: center;
			background-color: color-mix(in srgb, var(--background-500) 30%, transparent);
			padding: 0.5rem 0.5rem;
			border-bottom: 1px solid var(--border_clr);

			div {
				display: flex;
				align-items: center;
			}
		}

		.content {
			padding: 0.5rem 0.5rem;
		}

		margin-bottom: 0.5rem;
	}

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

	.component-wrapper {
		padding: 0.5rem;
		border-radius: 6px;
	}
</style>
