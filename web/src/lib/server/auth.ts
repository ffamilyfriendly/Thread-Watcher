import { SvelteKitAuth } from '@auth/sveltekit';
import Discord from '@auth/core/providers/discord';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, AUTH_SECRET } from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Discord({
			clientId: DISCORD_CLIENT_ID,
			clientSecret: DISCORD_CLIENT_SECRET,
			authorization: {
				params: {
					scope: 'identify guilds'
				}
			}
		})
	],
	secret: AUTH_SECRET,
	trustHost: true,

	callbacks: {
		async jwt({ token, account }) {
			if (account) {
				token.access_token = account.access_token;
			}
			return token;
		},

		async session({ session, token }) {
			session.access_token = token.access_token;
			return session;
		}
	}
});
