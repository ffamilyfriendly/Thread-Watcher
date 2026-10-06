import type { PipelineModule, TypedPipelineModule } from '@watcher/shared';
import RoleAssign from './RoleAssign.svelte';
import type { Component } from 'svelte';
import ChannelAssign from './ChannelAssign.svelte';
import SetName from './SetName.svelte';
import NarrowAnswer from './NarrowAnswer.svelte';
import OpenTicket from './OpenTicket.svelte';
import SilentResolve from './SilentResolve.svelte';
import QuestionModule from './QuestionModule/QuestionModule.svelte';
import {
	AppWindow,
	Bot,
	Box,
	Ghost,
	Hash,
	Shield,
	TextCursor,
	TicketPlus,
	type IconProps
} from '@lucide/svelte';

export type RenderableModuleTypes = Exclude<PipelineModule['type'], 'ROOT_ENV_MODULE'>;

type ModuleRegistry = {
	[K in RenderableModuleTypes]: Component<{ module: TypedPipelineModule<K> }>;
};

type ModuleIcons = {
	[K in PipelineModule['type']]: Component<IconProps>;
};

export const MODULE_COMPONENTS: ModuleRegistry = {
	ASSIGN_ROLE: RoleAssign,
	NARROW_ISSUE: NarrowAnswer,
	ASSIGN_CHANNEL: ChannelAssign,
	ASSIGN_NAME: SetName,
	OPEN_TICKET: OpenTicket,
	SILENT_RESOLVE: SilentResolve,
	MODAL_QUESTION: QuestionModule
};

export const MODULE_ICONS: Partial<ModuleIcons> = {
	NARROW_ISSUE: Bot,
	ASSIGN_CHANNEL: Hash,
	ASSIGN_ROLE: Shield,
	ASSIGN_NAME: TextCursor,
	OPEN_TICKET: TicketPlus,
	SILENT_RESOLVE: Ghost,
	MODAL_QUESTION: AppWindow
};

export function get_module_icon(module_name: PipelineModule['type']): Component<IconProps> {
	return Object.hasOwn(MODULE_ICONS, module_name) && MODULE_ICONS[module_name]
		? MODULE_ICONS[module_name]
		: Box;
}

export type ModuleType = keyof typeof MODULE_COMPONENTS;
