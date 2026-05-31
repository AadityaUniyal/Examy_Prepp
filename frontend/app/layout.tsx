import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ExamEve — AI-Powered Exam Preparation',
  description: 'Smart exam preparation platform that helps you study efficiently in 48-96 hours with AI-driven study plans, panic detection, and adaptive quizzes.',
  keywords: ['exam preparation', 'AI study', 'study planner', 'quiz engine', 'exam anxiety'],
  openGraph: {
    title: 'ExamEve — AI-Powered Exam Preparation',
    description: 'Study smarter, not harder. AI-optimized exam prep in 48-96 hours.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
