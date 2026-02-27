import {
	DEFAULT_TICKET_PANEL,
	MODULE_OUTPUTS,
	ZTicketPanel,
	type ModuleObject,
	type ModuleProperty,
	type Pipeline,
	type PipelineModule,
	type RenderableModule,
	type TicketPanel
} from '@watcher/shared';
import { getContext, setContext } from 'svelte';

export type RenderablePipeline = RenderableModule[];

export class PipelineState {
	public panel = $state<TicketPanel>(DEFAULT_TICKET_PANEL);

	constructor(panel?: TicketPanel) {
		if (panel) this.panel = panel;
	}

	get modules() {
		return this.panel.pipeline;
	}

	set modules(v) {
		this.panel.pipeline = v;
	}

	safe_modules(): RenderablePipeline {
		return this.modules.filter((m) => m.type !== 'ROOT_ENV_MODULE');
	}

	move_module(to_idx: number, module_uid: string) {
		console.log('move_module', to_idx, module_uid);
		const old_idx = this.panel.pipeline.findIndex((mod) => mod.uid === module_uid);

		if (old_idx === -1) throw new Error('Tried to move a module that does not exist');

		const item = this.modules.splice(old_idx, 1)[0];
		this.modules.splice(to_idx, 0, item);
	}

	private get_valid_module_def_or_throw(module_type: string): ModuleObject {
		const module_def = MODULE_OUTPUTS[module_type as keyof typeof MODULE_OUTPUTS];
		if (!module_def) throw new Error(`no module with type '${module_type}' exists`);
		if (!module_def.schema)
			throw new Error(`module '${module_def.name}' (${module_type}) does not export a schema`);
		return module_def;
	}

	delete_module(uid: string) {
		this.modules = this.modules.filter((mod) => mod.uid !== uid);
	}

	create_module_with_defaults(to_idx: number, module_type: string) {
		const module_def = this.get_valid_module_def_or_throw(module_type);
		if (!module_def.schema) return; // We check for schema in 'get_valid_module_def_or_throw'. This is to keep typechecker happy

		const uid = crypto.randomUUID();
		const id = `${module_type.toLowerCase()}_${this.modules.length + 1}`;

		const new_obj = module_def.schema.parse({ uid, id, conditional_type: 'AND', conditionals: [] });
		if (new_obj.type === 'ROOT_ENV_MODULE')
			throw new Error("you cannot create a 'ROOT_ENV_MODULE' module");

		this.modules.splice(to_idx, 0, new_obj);
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
		if (!this.panel) throw Error('no panel');
		const mods = this.get_copy(modules);
		const r = new Map<string, ModuleProperty[]>();

		for (const mod of mods) {
			const rvs = MODULE_OUTPUTS[mod.type];
			r.set(mod.id, rvs.properties(mod, this.panel));
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

	set_modules(modules: RenderablePipeline) {
		this.modules = modules;
	}
}

const PIPELINE_KEY = Symbol('PIPELINE');

export function is_clean_pipeline(pl: Pipeline): pl is RenderablePipeline {
	return !pl.find((p) => p.type === 'ROOT_ENV_MODULE');
}

export function clean_or_throw(pl: Pipeline): RenderablePipeline {
	if (is_clean_pipeline(pl)) return pl;
	throw new Error('unclean pipeline was passed!');
}

export function init_pipeline_state(initial_data?: TicketPanel) {
	return setContext(PIPELINE_KEY, new PipelineState(initial_data));
}

export function use_pipeline() {
	const state = getContext<PipelineState>(PIPELINE_KEY);
	if (!state) throw new Error('use_pipeline called outside of provider');
	return state;
}
