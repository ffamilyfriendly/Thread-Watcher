import { JWT_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';
import { err, Result, ok } from 'neverthrow';
import type z from 'zod';

export function parse_jwt_or_throw<T>(JWT: string, schema: z.ZodType<T>) {
	const jwt_decoded = jwt.verify(JWT, JWT_SECRET);
	return schema.parse(jwt_decoded);
}
export function parse_jwt_safe<T>(JWT: string, schema: z.ZodType<T>) {
	const jwt_decoded = Result.fromThrowable(jwt.verify)(JWT, JWT_SECRET);

	if (jwt_decoded.isErr()) return err(jwt_decoded.error);

	const parsed = schema.safeParse(jwt_decoded.value);
	if (!parsed.success) return err(parsed.error);

	return ok(parsed.data);
}
