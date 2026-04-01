/**
 *  @description generate a vibrant HSL colour from arbitrary string
 * @param str
 * @returns CSS repr. of HSL colour generated from string
 */
export function str_to_vibrant_clr(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
}

export function get_contrast_colour(hsl: string): 'black' | 'white' {
	const lightness = parseInt(hsl.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/)?.[1] ?? '50');
	return lightness > 50 ? 'black' : 'white';
}
