<script lang="ts">
	import DurationInput from '$lib/components/ui/inputs/DurationInput.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import SettingBox from '$lib/components/ui/settings/SettingBox.svelte';
	import EmbedConfigurator from '$lib/components/ui/tickets/EmbedConfigurator.svelte';
	import EmbedConfiguratorNew from '$lib/components/ui/tickets/EmbedConfiguratorNew.svelte';
	import TextInput from '$lib/components/ui/tickets/modules/QuestionModule/configurators/TextInput.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { init_pipeline_state, use_pipeline } from '$lib/stores/pipeline.svelte';
	import { CAN_HOLD_THREADS } from '$lib/types/discord';
	import style from '../panel.module.scss';

	const guild_state = use_guild_state();

	let pipeline_state = use_pipeline();
</script>

<section class={style.section}>
	<div class={style.explainer}>
		<h2>Panel Name</h2>
		<p>
			Set an internal name to identify this panel in your admin dashboard. This will not appear in
			user-facing parts of Thread-Watcher and is only for the sake of your organization.
		</p>
		<input placeholder="Panel Name" class={style.input} bind:value={pipeline_state.panel.name} />
	</div>

	<div class={style.explainer}>
		<h2>Panel Description</h2>
		<textarea
			placeholder="Add a brief internal description of this panel's purpose. This is only visible to staff with access to the configuration"
			class={style.textarea}
			bind:value={pipeline_state.panel.description}
		>
		</textarea>
	</div>
</section>

<h2 class={style.divine_divider}>Embeds</h2>

<section class={style.embed_section}>
	<div class={style.explainer}>
		<h2>Panel Embed</h2>
		<p>This is the embed that is used to start the panel flow</p>
		<EmbedConfigurator bind:value={pipeline_state.panel.commencement_embed} />
	</div>
	<div class={style.explainer}>
		<h2>Resolve Embed</h2>
		<p>This is the embed that is sent in the ticket when its resolved</p>
		<EmbedConfigurator use_variable_picker={true} bind:value={pipeline_state.panel.resolve_embed} />
	</div>
</section>

<h2 class={style.divine_divider}>Defaults</h2>

<section class={style.section}>
	<div class={style.explainer}>
		<h2>Assigned Roles</h2>
		<p>
			Select the server roles to be notified with a mention when a new ticket thread is opened in
			this panel.
		</p>
		<RolePicker
			roles={guild_state.roles}
			multiple={true}
			bind:value={pipeline_state.panel.initial_assigned_roles}
		/>
	</div>

	<div class={style.explainer}>
		<h2>Ticket Channel</h2>
		<p>
			Set the default Discord channel where ticket threads for this panel will be created. This can
			be overridden dynamically in the flow configuration.
		</p>
		<ChannelPicker
			channels={guild_state.channels}
			guild_id={guild_state.guild_id!}
			only_with_types={CAN_HOLD_THREADS}
			bind:value={pipeline_state.panel.initial_channel_id}
		/>
	</div>
</section>

<h2 class={style.divine_divider}>Limits</h2>

<section class={style.section}>
	<div class={style.explainer}>
		<h2>Max Concurrant Tickets</h2>
		<p>
			Set the maximum number of open tickets a user can have at the same time in this panel. Note:
			This limit is <b>per panel</b>, not a global user limit.
		</p>
		<input
			type="number"
			class={style.input}
			bind:value={pipeline_state.panel.max_concurring_tickets}
		/>
	</div>

	<div class={style.explainer}>
		<h2>Ticket Cooldown</h2>
		<p>
			Set the cooldown period between ticket creations for each user in this panel. Users must wait
			this duration before opening another ticket
		</p>
		<DurationInput bind:duration_as_seconds={pipeline_state.panel.ticket_cooldown_seconds} />
		<small><b>Active cooldowns cannot be revoked.</b> Ensure you don't pick a too high value.</small
		>
	</div>
</section>

<h2 class={style.divine_divider}>Integrations</h2>

<section class={style.section}>
	<div class={style.explainer}>
		<h2>Watch Tickets</h2>
		<p>
			When enabled, tickets in this panel will be <b>watched</b> and protected from automatic archiving
			or hiding by Discord.
		</p>
		<Toggle bind:value={pipeline_state.panel.should_watch_ticket} />
	</div>
	<div class={style.explainer}>
		<h2>AI Assist</h2>
		<p>
			When enabled, the bot will start a DM conversation with the ticket creator to understand their
			issue and attempt to provide an automated answer using your <b>flow configuration</b> and
			server <a href="../../../library">library</a> before creating a ticket thread.
		</p>
		<Toggle bind:value={pipeline_state.panel.ai_assist} />
	</div>
</section>

<style lang="scss">
	small {
		color: var(--error-500);
		opacity: 0.6;
	}
</style>
