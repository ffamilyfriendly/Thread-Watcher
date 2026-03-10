import { DefaultSession } from '@auth/sveltekit';
import { JWT } from '@auth/core/jwt';
import { User } from '@auth/core/types';
import type { Session } from '@auth/sveltekit';

declare module '@auth/core/types' {
	interface Session {
		access_token?: string;
		error?: string;
		user: User & {
			id: string;
		} & DefaultSession['user'];
	}
}

declare module '@auth/core/jwt' {
	interface JWT {
		access_token?: string;
		expires_at?: number;
		refresh_token?: string;
		error?: string;
		id?: string;
	}
}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: Session['user'];
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
