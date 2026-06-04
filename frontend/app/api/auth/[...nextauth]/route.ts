import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token) {
        (session as any).providerAccountId = token.sub;
        (session as any).backendToken = token.backendToken;
      }
      return session
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        if (account.provider === 'google') {
          try {
            const graphqlUrl = process.env.GRAPHQL_URL_SERVER || 'http://backend:4000/graphql';
            const response = await fetch(graphqlUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `
                  mutation LoginWithGoogle($email: String!, $name: String!, $googleId: String) {
                    loginWithGoogle(email: $email, name: $name, googleId: $googleId) {
                      token
                    }
                  }
                `,
                variables: {
                  email: user.email,
                  name: user.name || 'Google User',
                  googleId: account.providerAccountId
                }
              })
            });
            const resData = await response.json();
            if (resData.data?.loginWithGoogle?.token) {
              token.backendToken = resData.data.loginWithGoogle.token;
            }
          } catch (err) {
            console.error('Failed to exchange NextAuth Google token for backend JWT:', err);
          }
        }
      }
      return token
    }
  },
  pages: {
    signIn: '/login',
  },
})

export { handler as GET, handler as POST }
