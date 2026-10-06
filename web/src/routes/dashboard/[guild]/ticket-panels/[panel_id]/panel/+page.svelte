<script lang="ts">
	import Explainer from '$lib/components/ui/Explainer.svelte';
	import DurationInput from '$lib/components/ui/inputs/DurationInput.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import Tab from '$lib/components/ui/TabbedView/Tab.svelte';
	import TabbedView from '$lib/components/ui/TabbedView/TabbedView.svelte';
	import ButtonConfigurator from '$lib/components/ui/tickets/ButtonConfigurator.svelte';
	import EmbedConfigurator from '$lib/components/ui/tickets/EmbedConfigurator.svelte';
	import StringSelectConfigurator from '$lib/components/ui/tickets/StringSelectConfigurator.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import { CAN_HOLD_THREADS } from '$lib/types/discord';
	import style from '../panel.module.scss';

	const guild_state = use_guild_state();

	let pipeline_state = use_pipeline();
</script>

<section class={style.section}>
	<Explainer
		title="Panel Name"
		description="			Set an internal name to identify this panel in your admin dashboard. This will not appear in
			user-facing parts of Thread-Watcher and is only for the sake of your organization."
	>
		<input placeholder="Panel Name" class={style.input} bind:value={pipeline_state.panel.name} />
	</Explainer>

	<Explainer title="Panel Description">
		<textarea
			placeholder="Add a brief internal description of this panel's purpose. This is only visible to staff with access to the configuration"
			class={style.textarea}
			bind:value={pipeline_state.panel.description}
		>
		</textarea>
	</Explainer>
</section>

<h2 class={style.divine_divider}>Embeds</h2>

<section class={style.embed_section}>
	<Explainer
		title="Panel Embed"
		description="This is the embed that is used to start the panel flow"
	>
		<EmbedConfigurator bind:value={pipeline_state.panel.commencement_embed} />
	</Explainer>
	<Explainer
		title="Resolve Embed"
		description="This is the embed that is sent in the ticket when its resolved"
	>
		<EmbedConfigurator use_variable_picker={true} bind:value={pipeline_state.panel.resolve_embed} />
	</Explainer>
</section>

<h2 class={style.divine_divider}>Defaults</h2>

<section class={style.section}>
	<Explainer
		title="Opening Thing"
		description="Select in which way you want the ticket flow to start."
	>
		<TabbedView
			bind:active_tab={pipeline_state.panel.commencement_method.type}
			default_tab="button"
		>
			<Tab id="BUTTON" label="button">
				{#if pipeline_state.panel.commencement_method.type === 'BUTTON'}
					<ButtonConfigurator bind:value={pipeline_state.panel.commencement_method} />
				{/if}
			</Tab>
			<Tab id="SELECTION" label="select">
				{#if pipeline_state.panel.commencement_method.type === 'SELECTION'}
					<StringSelectConfigurator
						bind:options={pipeline_state.panel.commencement_method.options}
						bind:placeholder={pipeline_state.panel.commencement_method.placeholder}
					/>
				{/if}
			</Tab>
		</TabbedView>
	</Explainer>

	<Explainer
		title="Assigned Roles"
		description="			Select the server roles to be notified with a mention when a new ticket thread is opened in
			this panel."
	>
		<RolePicker
			roles={guild_state.roles}
			multiple={true}
			bind:value={pipeline_state.panel.initial_assigned_roles}
		/></Explainer
	>

	<Explainer
		title="Ticket Channel"
		description="			Set the default Discord channel where ticket threads for this panel will be created. This can
			be overridden dynamically in the flow configuration."
	>
		<ChannelPicker
			channels={guild_state.channels}
			guild_id={guild_state.guild_id!}
			only_with_types={CAN_HOLD_THREADS}
			bind:value={pipeline_state.panel.initial_channel_id}
		/>
	</Explainer>
</section>

<h2 class={style.divine_divider}>Limits</h2>

<section class={style.section}>
	<Explainer title="Max Concurrant Tickets">
		{#snippet description()}
			Set the maximum number of open tickets a user can have at the same time in this panel. Note:
			This limit is <b>per panel</b>, not a global user limit.
		{/snippet}
		<input
			type="number"
			class={style.input}
			bind:value={pipeline_state.panel.max_concurring_tickets}
		/>
	</Explainer>

	<Explainer
		title="Ticket Cooldown"
		description="			Set the cooldown period between ticket creations for each user in this panel. Users must wait
			this duration before opening another ticket"
	>
		<DurationInput bind:duration_as_seconds={pipeline_state.panel.ticket_cooldown_seconds} />
		<small><b>Active cooldowns cannot be revoked.</b> Ensure you don't pick a too high value.</small
		>
	</Explainer>
</section>

<h2 class={style.divine_divider}>Integrations</h2>

<section class={style.section}>
	<Explainer title="Watch Tickets">
		{#snippet description()}
			When enabled, tickets in this panel will be <b>watched</b> and protected from automatic archiving
			or hiding by Discord.
		{/snippet}

		<Toggle bind:value={pipeline_state.panel.should_watch_ticket} />
	</Explainer>

	<Explainer title="AI Assist" description="asd">
		<Toggle bind:value={pipeline_state.panel.ai_assist} />
	</Explainer>
</section>

<style lang="scss">
	small {
		color: var(--error-500);
		opacity: 0.6;
	}
</style>
