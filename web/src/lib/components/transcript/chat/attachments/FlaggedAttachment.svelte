<script lang="ts">
	import { Crown, FileWarning, Ghost } from "@lucide/svelte";
	import type { PublicTicketMessageAttachment } from "@watcher/shared";

    interface Props {
        attachment: PublicTicketMessageAttachment
    }
    const { attachment }: Props = $props()

    const Icon = $derived.by(() => {
        switch(attachment.flag) {
            case "SPOOKY_FILE":
                return Ghost
            case "EXCEEDS_FREE_FILE_LIMIT":
                return Crown
            default:
                return FileWarning
        }
    })

    const explanation_text = $derived.by(() => {
        switch(attachment.flag) {
            case "SPOOKY_FILE":
                return "file was too spooky (executable)"
            case "EXCEEDS_SIZE_LIMIT":
                return "Exceeds size limit"
            case "EXCEEDS_FREE_FILE_LIMIT":
                return "Exceeds free size limit"
            case "IS_UPLOADING":
                return "is being uploaded..."
            case "NO_FILE_ENDING":
                return "had no file ending"
            case "UPLOAD_FAILED":
                return "upload failed!"
            case "SUSPICIOUS_FILENAME":
                return "had a suspicious filename"
            case "IS_QUARANTINED":
                return "is quarantined after being reported"
        }
    })
</script>


<div class="file">
    <div class="inner" class:premium={attachment.flag === "EXCEEDS_FREE_FILE_LIMIT"}>        
        <Icon />
        <div>
            <p>{attachment.filename}</p>
            <p class="explanation">
                {explanation_text}
            </p>
        </div>
    </div>
</div>


<style>
    .file {
        width: 500px;
        align-items: center;
        display: flex;
    }

    .explanation {
        opacity: .7;
        font-size: small;
    }

    .inner {
        display: flex;
        gap: .5rem;
        align-items: center;
        background-color: color-mix(in srgb, white 5%, transparent);
        border: 1px solid color-mix(in srgb, white 10%, transparent);
        border-radius: .25rem;
        padding: .25rem 1rem;

        &.premium {
            background-color: color-mix(in srgb, var(--premium-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--premium-500) 20%, transparent);
            color: color-mix(in srgb, var(--premium-400) 70%, white);
        }
    }
</style>