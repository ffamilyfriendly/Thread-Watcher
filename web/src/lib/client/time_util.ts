// Stole from https://dev.to/magnificode/secret-javascript-methods-they-dont-want-you-to-see-part-4-intlrelativetimeformat-1e8k
// and slightly adapted for TS and my weird variable naming scheme
export function get_pwetty_relative_time(
	d: Date,
	format_style: Intl.RelativeTimeFormatStyle = 'long'
) {
	const secondsDiff = Math.round((d.getTime() - Date.now()) / 1000);

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
	const unit_index = units_in_sec.findIndex((cutoff) => cutoff > Math.abs(secondsDiff));

	// Get the divisor to convert seconds to the appropriate unit
	const divisor = unit_index ? units_in_sec[unit_index - 1] : 1;

	// Initialize Intl.RelativeTimeFormat
	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: format_style });

	// Format the relative time based on the calculated unit
	return rtf.format(Math.floor(secondsDiff / divisor), unit_strings[unit_index]);
}
