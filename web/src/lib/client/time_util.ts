// Stole from https://dev.to/magnificode/secret-javascript-methods-they-dont-want-you-to-see-part-4-intlrelativetimeformat-1e8k
// and slightly adapted for TS and my weird variable naming scheme
export function get_pwetty_relative_time(
	d: Date,
	format_style: Intl.RelativeTimeFormatStyle = 'long'
) {
	const secondsDiff = Math.round((d.getTime() - Date.now()) / 1000);
	return get_pwetty_relative_time_delta(secondsDiff, format_style);
}

export function get_pwetty_relative_time_delta(
	seconds: number,
	format_style: Intl.RelativeTimeFormatStyle = 'long'
) {
	// Array representing one minute, hour, day, week, month, etc. in seconds
	const units_in_sec = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];

	// Array equivalent to the above but in the string representation of the units
	const unit_strings: Intl.RelativeTimeFormatUnit[] = [
		'second',
		'minute',
		'hour',
		'day',
		'week',
		'month',
		'year'
	];

	// Find the appropriate unit based on the seconds difference
	const unit_index = units_in_sec.findIndex((cutoff) => cutoff > Math.abs(seconds));

	// Get the divisor to convert seconds to the appropriate unit
	const divisor = unit_index ? units_in_sec[unit_index - 1] : 1;

	// Initialize Intl.RelativeTimeFormat
	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: format_style });

	// Format the relative time based on the calculated unit
	return rtf.format(Math.floor(seconds / divisor), unit_strings[unit_index]);
}

export function get_time_from_seconds(tot_seconds: number) {
	const hours = Math.floor(tot_seconds / 3600);
	tot_seconds %= 3600;
	const minutes = Math.floor(tot_seconds / 60);
	const seconds = tot_seconds % 60;
	return { hours, minutes, seconds };
}

export function get_timestring_from_seconds(seconds_f: number) {
	const { hours, minutes, seconds } = get_time_from_seconds(seconds_f);

	let str = '';
	if (hours > 0) str += `${hours}h `;
	if (minutes > 0) str += `${minutes}m `;
	str += `${seconds}s`;
	return str;
}
