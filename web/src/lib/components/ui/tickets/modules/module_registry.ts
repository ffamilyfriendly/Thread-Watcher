import type { PipelineModule, TypedPipelineModule } from '@watcher/shared';
import RoleAssign from './RoleAssign.svelte';
import type { Component } from 'svelte';
import ChannelAssign from './ChannelAssign.svelte';
import SetName from './SetName.svelte';
import NarrowAnswer from './NarrowAnswer.svelte';
import OpenTicket from './OpenTicket.svelte';
import SilentResolve from './SilentResolve.svelte';
import QuestionModule from './QuestionModule.svelte';

export type RenderableModuleTypes = Exclude<PipelineModule['type'], 'ROOT_ENV_MODULE'>;

type ModuleRegistry = {
	[K in RenderableModuleTypes]: Component<{ module: TypedPipelineModule<K> }>;
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

export type ModuleType = keyof typeof MODULE_COMPONENTS;
