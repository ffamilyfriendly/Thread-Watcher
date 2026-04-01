<script lang="ts">
	import { use_pipeline, type RenderablePipeline } from "$lib/stores/pipeline.svelte";
	import { Flag, Sparkle, TreePine } from "@lucide/svelte";

    const pipe_state = use_pipeline();

    const presets = {
        blank: [{"uid":"6f7134f1-c55b-47dd-bb23-6b825d432116","id":"open_ticket_3","conditional_type":"AND","conditionals":[],"private_thread":true,"embed":{"title":"New Ticket","fields":[],"description":"Thank you for opening a ticket, {{env.user.tag}}","colour":"#ff3366"},"type":"OPEN_TICKET"}],
        report_user: [{"uid":"2d71af75-649b-4713-8f3d-ba28fbfd7f3c","id":"report_details","conditional_type":"AND","conditionals":[],"title":"Details","labels":[{"label":"Reported User","uid":"f4333f18-ec70-4bf6-9e16-efb8fd4dc12d","description":"please tell us what user you wish to report","component":{"custom_id":"USER_SELECT_1","required":true,"placeholder":"Select a value","min_values":1,"max_values":1,"type":"USER_SELECT"}},{"label":"Reason","uid":"4f569d96-92ef-4781-a626-eb617d1ed6cf","description":"Give us a detailed reason why you are reporting this user","component":{"custom_id":"TEXT_INPUT_1","required":true,"min_values":0,"max_values":4000,"type":"TEXT_INPUT"}}],"type":"MODAL_QUESTION"},{"uid":"911822bc-e9e6-4253-8a04-1eab421bc583","id":"assign_name_2","conditional_type":"AND","conditionals":[],"new_name":"[REPORT] {{report_details.USER_SELECT_1.username}}","type":"ASSIGN_NAME"},{"uid":"6f7134f1-c55b-47dd-bb23-6b825d432116","id":"open_ticket_3","conditional_type":"AND","conditionals":[],"private_thread":true,"embed":{"title":"User Reported","fields":[{"title":"Reported User","text":"{{report_details.USER_SELECT_1.tag}}"},{"title":"Report Reason","text":"{{report_details.TEXT_INPUT_1}}"}],"description":"Thank you for your report, {{env.user.tag}}. One of our <@&{{env.assigned_roles[0].id}}> will get back to you as soon as possible!\n-# **Missed something?** Supply additional information in the thread!","colour":"#ff3366"},"type":"OPEN_TICKET"}],
        report_user_ai: [{"uid":"2d71af75-649b-4713-8f3d-ba28fbfd7f3c","id":"report_details","conditional_type":"AND","conditionals":[],"title":"Details","labels":[{"label":"Reported User","uid":"f4333f18-ec70-4bf6-9e16-efb8fd4dc12d","description":"please tell us what user you wish to report","component":{"custom_id":"USER_SELECT_1","required":true,"placeholder":"Select a value","min_values":1,"max_values":1,"type":"USER_SELECT"}},{"label":"Reason","uid":"4f569d96-92ef-4781-a626-eb617d1ed6cf","description":"Give us a detailed reason why you are reporting this user","component":{"custom_id":"TEXT_INPUT_1","required":true,"min_values":0,"max_values":4000,"type":"TEXT_INPUT"}}],"type":"MODAL_QUESTION"},{"uid":"911822bc-e9e6-4253-8a04-1eab421bc583","id":"assign_name_2","conditional_type":"AND","conditionals":[],"new_name":"[REPORT] {{report_details.USER_SELECT_1.username}}","type":"ASSIGN_NAME"},{"uid":"3372005b-591b-4eee-bc5d-c9af2ab6733a","id":"narrow_issue_4","conditional_type":"AND","conditionals":[],"persona":"You are a kind but direct agent tasked with handling the information gathering regarding a reported discord user","rules":"Ensure:\n- what server rule the user broke\n- (if applicable) the context of which the infraction happened such as the leadup","type":"NARROW_ISSUE","max_responses":3},{"uid":"6f7134f1-c55b-47dd-bb23-6b825d432116","id":"open_ticket_3","conditional_type":"AND","conditionals":[],"private_thread":true,"embed":{"title":"User Reported","fields":[{"title":"Reported User","text":"{{report_details.USER_SELECT_1.tag}}","is_inline":true},{"title":"Reason Summary","text":"{{narrow_issue_4.issue}}","is_inline":true},{"title":"User Provided Reason","text":"{{report_details.TEXT_INPUT_1}}"}],"description":"Thank you for your report, {{env.user.tag}}. One of our <@&{{env.assigned_roles[0].id}}> will get back to you as soon as possible!\n-# **Missed something?** Supply additional information in the thread!","colour":"#ff3366"},"type":"OPEN_TICKET"}]
    } as const satisfies Record<string, RenderablePipeline>

    function load(preset_name: keyof typeof presets) {
        const pipeline = presets[preset_name]
        pipe_state.set_modules(pipeline)
    }
</script>

<div class="container">

    <button onclick={() => load("blank")} class="card blank">
        <div class="head">
            <TreePine />
            <h3>Clean</h3>
        </div>
        <p>
            A clean slate for you to work with! Get to learn the basics <a target="_blank" href="https://docs.threadwatcher.xyz/features/tickets/ticket-panels">in the documentation</a>!
        </p>
    </button>

    <button onclick={() => load("report_user")} class="card report">
        <div class="head">
            <Flag />
            <h3>Report User</h3>
        </div>
        <p>
            A straightforward user report pipeline. Asks for the reported user and a reason, then opens a private ticket for your staff to review.
        </p>
    </button>

    <button onclick={() => load("report_user_ai")} class="card ai">
        <div class="head">
            <Sparkle />
            <h3>Report User (AI)</h3>
        </div>
        <p>
            Same as Report User but with an AI follow-up step that gathers additional context before opening the ticket! Ensuring staff have everything they need to act immediately.
        </p>
    </button>
</div>

<style lang="scss">
    .container {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: space-evenly;
    }

    .card {
        all: unset;
        background-color: var(--background-500);
        border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
        padding: .5rem;
        border-radius: .5rem;
        display: flex;
        flex-direction: column;
        cursor: pointer;
        aspect-ratio: 1/1;
        width: 20ch;
        transition: .2s ease-out;

        p {
            color: color-mix(in srgb, var(--accent), white 80%);
            opacity: .7;
        }

        .head {
            display: flex;
            align-items: center;
            gap: .5rem;
            color: var(--accent);
            border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
            padding-bottom: .25rem;
            margin-bottom: .5rem;

            h3 {
                color: color-mix(in srgb, var(--accent), white);
            }
        }

        &:hover {
            transform: scale(1.05);
            box-shadow: color-mix(in srgb, var(--accent) 10%, transparent) 0px 7px 29px 0px;
        }
    }

    .blank {
        --accent: var(--success-500);
    }

    .report {
        --accent: var(--error-200);
    }

    .ai {
        --accent: rebeccapurple;
    }
</style>