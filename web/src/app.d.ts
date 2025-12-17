import { DefaultSession } from '@auth/sveltekit';
import { JWT } from '@auth/core/jwt';

declare module '@auth/core/types' {
	interface Session {
		access_token?: string;
	}
}

declare module '@auth/core/jwt' {
	interface JWT {
		access_token?: string;
	}
}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
