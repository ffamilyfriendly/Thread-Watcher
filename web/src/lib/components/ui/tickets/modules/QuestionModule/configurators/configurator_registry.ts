import type {
	ModalComponent,
	PipelineModule,
	TypedComponent,
	TypedPipelineModule
} from '@watcher/shared';
import type { Component } from 'svelte';
import StringSelect from './StringSelect.svelte';
import TextInput from './TextInput.svelte';
import GenericSelect from './GenericSelector.svelte';
import ChannelSelect from './ChannelSelect.svelte';
import FileSelect from './FileSelect.svelte';

type ComponentRegistry = {
	[K in ModalComponent['type']]: Component<{ data: TypedComponent<K>; this_uid: string }>;
};

export function get_typed_component<K extends ModalComponent['type']>(comp_type: K) {
	return LABEL_COMPONENTS[comp_type] as Component<{ data: TypedComponent<K>; this_uid: string }>;
}

export const LABEL_COMPONENTS: ComponentRegistry = {
	STRING_SELECT: StringSelect,
	TEXT_INPUT: TextInput,
	USER_SELECT: GenericSelect,
	MENTIONABLE_SELECT: GenericSelect,
	ROLE_SELECT: GenericSelect,
	CHANNEL_SELECT: ChannelSelect,
	FILE_UPLOAD: FileSelect
};

export type ComponentType = keyof typeof LABEL_COMPONENTS;
