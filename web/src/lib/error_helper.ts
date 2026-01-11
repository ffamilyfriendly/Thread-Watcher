export function map_err(error: unknown) {
	if (error instanceof Error) return error;

	return new Error(`Unknown error: ${String(error)}`);
}
