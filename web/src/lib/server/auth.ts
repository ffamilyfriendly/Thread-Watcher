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
				return {
					...token,
					access_token: account.access_token,
					expires_at: account.expires_at,
					refresh_token: account.refresh_token,
					id: account.providerAccountId
				};
			}

			const now = Math.floor(Date.now() / 1000);
			if (now > (token.expires_at as number)) {
				// Could not get refresh endpoint working :(
				// Users will have to deal with getting logged out once in a while (about once per week)
				return { ...token, error: 'AccessTokenExpired' };
			}

			return token;
		},

		async session({ session, token }) {
			session.access_token = token.access_token;
			if (token.error) {
				session.error = token.error;
			}
			if (token.id) {
				session.user.id = token.id as string;
			}

			return session;
		}
	}
});
