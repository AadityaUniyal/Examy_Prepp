import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { RetryLink } from '@apollo/client/link/retry'
import { getSession } from 'next-auth/react'

const httpLink = createHttpLink({
  uri: typeof window === 'undefined'
    ? (process.env.GRAPHQL_URL_SERVER || 'http://backend:4000/graphql')
    : (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql'),
})

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true
  },
  attempts: {
    max: 3,
    retryIf: (error) => !!error
  }
})

const authLink = setContext(async (_, { headers }) => {
  let token = ''
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('exameve_token')
    if (saved) {
      token = saved
    } else {
      const session = await getSession()
      if (session && (session as any).backendToken) {
        token = (session as any).backendToken
      }
    }
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  }
})

export const client = new ApolloClient({
  link: retryLink.concat(authLink).concat(httpLink),
  cache: new InMemoryCache(),
})
