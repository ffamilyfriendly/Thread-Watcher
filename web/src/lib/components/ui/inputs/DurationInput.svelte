<script lang="ts">
	import { get_time_from_seconds, get_timestring_from_seconds } from '$lib/client/time_util';
	import shared from './shared.module.scss';

	let { duration_as_seconds = $bindable() }: { duration_as_seconds?: number | null } = $props();

	const safe_dur_as_sec = get_time_from_seconds(duration_as_seconds ?? 0);

	let seconds_input = $state(safe_dur_as_sec.seconds);
	let minutes_input = $state(safe_dur_as_sec.minutes);
	let hours_input = $state(safe_dur_as_sec.hours);

	function focused(el: HTMLInputElement) {
		el.addEventListener('focus', () => {
			el.select();
		});
	}

	function clamp_input_value(lower_bound: number, upper_bound: number, value: number) {
		const safe_value = Number.isNaN(value) ? lower_bound : value;
		return Math.min(Math.max(safe_value, lower_bound), upper_bound);
	}

	const total_seconds = $derived(seconds_input + minutes_input * 60 + hours_input * 60 * 60);

	const pwetty = $derived.by(() => {
		return get_timestring_from_seconds(total_seconds);
	});

	$effect(() => {
		if (duration_as_seconds !== total_seconds) {
			duration_as_seconds = total_seconds;
		}
	});
</script>

<div class={shared.duration}>
	<input
		type="number"
		use:focused
		bind:value={() => hours_input, (input) => (hours_input = clamp_input_value(0, 24, input))}
	/>
	:
	<input
		use:focused
		type="number"
		bind:value={() => minutes_input, (input) => (minutes_input = clamp_input_value(0, 60, input))}
	/>
	:
	<input
		use:focused
		type="number"
		bind:value={() => seconds_input, (input) => (seconds_input = clamp_input_value(0, 60, input))}
	/>

	<span>({pwetty})</span>
</div>
