import type { PipelineModule, TypedPipelineModule } from '@watcher/shared';
import GenerateAnswer from './GenerateAnswer.svelte';
import RoleAssign from './RoleAssign.svelte';
import type { Component } from 'svelte';

type ModuleRegistry = {
	[K in PipelineModule['type']]: Component<{ module: TypedPipelineModule<K> }>;
};

export const MODULE_COMPONENTS: ModuleRegistry = {
	ASSIGN_ROLE: RoleAssign,
	GENERATE_ANSWER: GenerateAnswer
};

export type ModuleType = keyof typeof MODULE_COMPONENTS;
