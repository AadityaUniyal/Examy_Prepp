'use client'

import * as React from 'react'
import { SessionProvider } from 'next-auth/react'
import { ApolloProvider } from '@apollo/client'
import { client } from '@/lib/apollo-client'
import { Toaster } from '@/components/ui/toast'
import PanicModeModal from '@/components/PanicModeModal'

export function Providers({ children }: { children: React.ReactNode }) {
  const [isPanicOpen, setIsPanicOpen] = React.useState(false)

  React.useEffect(() => {
    const handlePanicTrigger = () => {
      setIsPanicOpen(true)
    }
    window.addEventListener('trigger-panic-modal', handlePanicTrigger)
    return () => {
      window.removeEventListener('trigger-panic-modal', handlePanicTrigger)
    }
  }, [])

  return (
    <SessionProvider>
      <ApolloProvider client={client}>
        {children}
        <Toaster />
        <PanicModeModal open={isPanicOpen} onClose={() => setIsPanicOpen(false)} />
      </ApolloProvider>
    </SessionProvider>
  )
}
