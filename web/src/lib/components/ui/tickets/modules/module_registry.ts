import type { PipelineModule, TypedPipelineModule } from '@watcher/shared';
import GenerateAnswer from './GenerateAnswer.svelte';
import RoleAssign from './RoleAssign.svelte';
import type { Component } from 'svelte';
import ChannelAssign from './ChannelAssign.svelte';
import SetName from './SetName.svelte';

export type RenderableModuleTypes = Exclude<PipelineModule['type'], 'ROOT_ENV_MODULE'>;

type ModuleRegistry = {
	[K in RenderableModuleTypes]: Component<{ module: TypedPipelineModule<K> }>;
};

export const MODULE_COMPONENTS: ModuleRegistry = {
	ASSIGN_ROLE: RoleAssign,
	NARROW_ISSUE: GenerateAnswer,
	ASSIGN_CHANNEL: ChannelAssign,
	ASSIGN_NAME: SetName
};

export type ModuleType = keyof typeof MODULE_COMPONENTS;
