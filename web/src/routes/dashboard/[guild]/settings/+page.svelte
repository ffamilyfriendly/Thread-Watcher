<script lang="ts">
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import SettingsBox from '$lib/components/ui/settings/SettingBox.svelte';
	import StringPicker from '$lib/components/ui/settings/StringPicker.svelte';

    const { data } = $props()

    const settings = $state({...data.guild.guild_settings})
    const is_dirty = $derived(JSON.stringify(settings) !== JSON.stringify(data.guild.guild_settings))
</script>

<SettingsBox name="Bot Master" description="Select the role that can access the bot dashboard." disclaimer="Any roll with Administrator will be considered a Bot Master">
    <RolePicker guild_id={data.guild_id} roles={data.roles} bind:value={settings.BOT_MASTER_ROLE} />
</SettingsBox>

<SettingsBox name="Logging Channel" description="Choose the channel where Thread-Watcher will send its logs.">
    <ChannelPicker guild_id={data.guild_id} channels={data.channels} bind:value={settings.LOGGING_CHANNEL} />
</SettingsBox>

<SettingsBox name="Bump Behaviour" description="Determine how the bot should handle threads that are becoming inactive.">
    <StringPicker bind:value={settings.BUMP_BEHAVIOUR} placeholder="Search Options" items={[
        { name: "Bump and Un-Archive", value: "BUMP_AND_UNARCHIVE", description: "keep thread un-archived and active" },
        { name: "Un-Archive", value: "UNARCHIVE_ONLY", description: "Only un-archive the thread" }
        ]} />
</SettingsBox>

{#if is_dirty}
WERE DIRTY :D
{/if}
