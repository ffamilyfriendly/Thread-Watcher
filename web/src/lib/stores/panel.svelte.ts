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
import type { init_guild_state } from './guild.svelte';
import { err, ok } from 'neverthrow';
import { fetch_as_json } from '$lib/client/fetch';
import z from 'zod';

export type RenderablePipeline = RenderableModule[];

export class PipelineState {
	public panel = $state<TicketPanel>({} as TicketPanel);
	public module_picker_open = $state(false);
	private stringified_initial_state? = $state<string>();
	public is_initialized = $state(false);

	constructor(guild_id: string, panel?: TicketPanel) {
		if (panel) this.init_guild_state(panel);
	}

	get modules() {
		return this.panel.pipeline;
	}

	set modules(v) {
		this.panel.pipeline = v;
	}

	// This function exists to strip away values that does not need to influence our "is_dirty" check such as the deployed message id or deployed channel id
	private static panel_sans_stuff(panel: TicketPanel) {
		const { discord_message_channel_id, discord_message_id, ...panel_data } = panel;
		return panel_data;
	}

	init_guild_state(panel: TicketPanel) {
		this.panel = structuredClone(panel);
		this.is_initialized = true;
		this.stringified_initial_state = JSON.stringify(PipelineState.panel_sans_stuff(this.panel));
	}

	// The reason this is a function and not a getter is cuz JSON.stringify can throw and in my eyes a getter should never ever throw
	is_dirty() {
		const stringified_current_state = JSON.stringify(PipelineState.panel_sans_stuff(this.panel));
		return stringified_current_state !== this.stringified_initial_state;
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

	get_panel() {
		return ZTicketPanel.safeParse(this.panel);
	}

	is_panel_state_legal(): { legal: boolean; why: string } {
		function hell_naw(why: string) {
			return { legal: false, why };
		}

		const commencement_method = this.panel.commencement_method;
		if (commencement_method.type === 'BUTTON' && commencement_method.button_text.length < 1)
			return hell_naw('commencement button has no text!');

		if (commencement_method.type === 'SELECTION' && commencement_method.options.length === 0)
			return hell_naw("There's no options set for the commencing string select");

		return { legal: true, why: "it's legal!" };
	}

	/**
	 * @description Saves changes to the ticket panel to da databaze 😎
	 */
	async save() {
		const panel_validation_result = this.get_panel();

		if (!panel_validation_result.success) return err(panel_validation_result.error);

		const res = await fetch_as_json(
			`/api/guild/${panel_validation_result.data.guild_id}/panels/${panel_validation_result.data.panel_id}`,
			{
				body: JSON.stringify(panel_validation_result.data),
				method: 'PUT'
			},
			z.object({ panel_id: z.string().default(this.panel.panel_id) })
		);

		if (res.isOk())
			this.stringified_initial_state = JSON.stringify(PipelineState.panel_sans_stuff(this.panel));

		return res;
	}

	async deploy_to_channel(channel_id: string) {
		const res = await fetch_as_json(
			`/api/panel/${this.panel.panel_id}/send_message`,
			{
				method: 'POST',
				body: JSON.stringify({
					channel_id: channel_id,
					guild_id: this.panel.guild_id,
					panel_id: this.panel.panel_id
				})
			},
			z.object({ message_id: z.string() })
		);

		if (res.isErr()) return err(res.error);

		this.panel.discord_message_id = res.value.message_id;
		this.panel.discord_message_channel_id = channel_id;

		return ok(res.value);
	}

	revert_changes() {
		if (!this.stringified_initial_state)
			return err(new Error('pipeline state manager contained no previous state to revert to :('));
		const state_copied = ZTicketPanel.safeParse(JSON.parse(this.stringified_initial_state));

		if (!state_copied.success) return err(state_copied.error);
		this.panel = state_copied.data;
		return ok();
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

export function init_pipeline_state(guild_id: string, initial_data?: TicketPanel) {
	return setContext(PIPELINE_KEY, new PipelineState(guild_id, initial_data));
}

export function use_pipeline() {
	const state = getContext<PipelineState>(PIPELINE_KEY);
	if (!state) throw new Error('use_pipeline called outside of provider');
	return state;
}
