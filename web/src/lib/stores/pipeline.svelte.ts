import {
	MODULE_OUTPUTS,
	type ModuleProperty,
	type Pipeline,
	type PipelineModule
} from '@watcher/shared';
import { getContext, setContext } from 'svelte';

export class PipelineState {
	public modules = $state<Pipeline>([]);

	constructor(initial_state: Pipeline) {
		this.set_modules(initial_state);
	}

	get_modules_before(uid: string) {
		let m: Pipeline = [];
		for (const module of this.modules) {
			if (module.uid === uid) break;
			m.push(module);
		}
		return m;
	}

	get_properties(modules: Pipeline) {
		const mods = this.get_copy(modules);
		const r = new Map<string, ModuleProperty[]>();

		for (const mod of mods) {
			const rvs = MODULE_OUTPUTS[mod.type];
			r.set(mod.id, rvs);
		}

		return r;
	}

	get_all_properties() {
		return this.get_properties(this.modules);
	}

	get_properties_before(uid: string): Map<string, ModuleProperty[]> {
		const modules = this.get_modules_before(uid);
		return this.get_properties(modules);
	}

	private create_env_module(): PipelineModule {
		return {
			id: 'env',
			uid: 'env',
			conditional_type: 'AND',
			conditionals: [],
			type: 'ROOT_ENV_MODULE'
		};
	}

	get_copy(modules: Pipeline) {
		return [this.create_env_module(), ...modules];
	}

	set_modules(modules: Pipeline) {
		this.modules = modules;
	}
}

const PIPELINE_KEY = Symbol('PIPELINE');

export function init_pipeline_state(initial_data: Pipeline) {
	return setContext(PIPELINE_KEY, new PipelineState(initial_data));
}

export function use_pipeline() {
	const state = getContext<PipelineState>(PIPELINE_KEY);
	if (!state) throw new Error('use_pipeline called outside of provider');
	return state;
}
