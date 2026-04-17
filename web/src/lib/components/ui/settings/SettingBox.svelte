<script lang="ts">
    import { Settings } from "@watcher/shared";
	import ChannelPicker from "./ChannelPicker.svelte";
	import { use_guild_state } from "$lib/stores/guild.svelte";
	import { ChannelTypes } from "$lib/types/discord";
	import Toggle from "../Toggle.svelte";
	import RolePicker from "./RolePicker.svelte";
	import StringPicker from "./StringPicker.svelte";

    interface Props {
        disclaimer?: string
        setting_key: Settings.SettingKey
        value: string | boolean | null
    }

    let {  disclaimer, setting_key, value = $bindable() }: Props = $props()
    const gs = use_guild_state()

    const setting = $derived(Settings.SETTINGS[setting_key])
</script>

<div class="setting_container">
    <div class="info">
        <h2>{setting.name}</h2>
        <p>{setting.description}</p>
    </div>
    <div class="input_area">

        {#if setting.type === "channel" && typeof value === "string"}
            <ChannelPicker
				only_with_types={[
					ChannelTypes.GUILD_ANNOUNCEMENT,
					ChannelTypes.GUILD_TEXT,
					ChannelTypes.PUBLIC_THREAD,
					ChannelTypes.PRIVATE_THREAD
				]}
				guild_id={gs.guild_id!}
				channels={gs.channels}
				bind:value={value}
			/>

        {:else if setting.type === "boolean" && typeof value === "boolean"}
            <div class="make_toggle_look_less_shitinizer">
                <Toggle bind:value={value} />
            </div>
        {:else if setting.type === "role" && typeof value === "string"}
            <RolePicker roles={gs.roles} bind:value={value} />
        {:else if setting.type === "string" && typeof value === "string"}
            <StringPicker bind:value={value} options={setting.options.map(s => ({ name: s.label, id: s.value }))} />
        {/if}

        {#if disclaimer}
            <small class="disclaimer">{disclaimer}</small>
        {/if}
    </div>
</div>

<style lang="scss">
.setting_container {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
    padding: 1.5rem 1rem; 
    transition: background-color 0.2s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.02); 
    }

    .info {
        h2 {
            font-size: 1.1rem;
            margin-bottom: 0.25rem;
        }
        p {
            font-size: 0.875rem;
            color: gray;
        }
    }
}

.make_toggle_look_less_shitinizer {
    margin-top: .5rem;
}

    .input_area{
        flex-grow: 1;
        max-width: 500px;

        small {
            color: var(--error-700);
            opacity: .7;
        }

        @media (max-width: 500px) {
            max-width: 100%;
            width: 100%;
		}
    }
</style>