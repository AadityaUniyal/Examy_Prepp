'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LayoutDashboard, Calendar, TestTube, Wind, BarChart3, LogOut, ShieldAlert, Settings, MessageSquare, Layers } from 'lucide-react'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  React.useEffect(() => {
    let tabSwitchCount = 0;
    let lastSwitchTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const now = Date.now();
        if (now - lastSwitchTime < 30000) {
          tabSwitchCount++;
          if (tabSwitchCount >= 4) {
            console.log('[Panic Protocol] High-frequency tab defocus detected!');
            window.dispatchEvent(new Event('trigger-panic-modal'));
            
            // Execute passive autopilot recalibration to reduce cognitive load
            fetch('/api/autopilot-recalibrate', { method: 'POST' })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  window.dispatchEvent(new CustomEvent('autopilot-recalibrated', { detail: data }));
                }
              })
              .catch(err => console.error(err));
              
            tabSwitchCount = 0;
          }
        } else {
          tabSwitchCount = 1;
        }
        lastSwitchTime = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Study Planner', href: '/planner', icon: Calendar },
    { name: 'Adaptive Quiz', href: '/quiz', icon: TestTube },
    { name: 'Pre-Exam Mode', href: '/pre-exam', icon: Wind },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Spaced Flashcards', href: '/flashcards', icon: Layers },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ]

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-slate-900/60 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col justify-between p-6 shrink-0 relative">
        {/* Glow indicator at the border */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-indigo-500/20 via-sky-500/40 to-emerald-500/20"></div>
        
        <div className="space-y-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-extrabold text-white text-xl">E</span>
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">ExamEve</span>
              <span className="block text-[10px] uppercase font-bold text-sky-400 tracking-wider">AI Optimizer</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all relative group ${
                    isActive 
                      ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  {/* Left indicator bubble */}
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r"></div>
                  )}
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Profile Footer */}
        <div className="space-y-4">
          {/* Panic trigger shortcut */}
          <button 
            onClick={() => {
              // Dispatch standard client-side event for PanicModeModal triggers
              window.dispatchEvent(new Event('trigger-panic-modal'))
            }}
            className="w-full flex items-center justify-center gap-2.5 bg-red-500/10 hover:bg-red-500/15 text-red-400 font-bold text-sm py-3 px-4 rounded-xl border border-red-500/20 transition-all hover:scale-[1.02] shadow-lg hover:shadow-red-500/5 active:scale-95"
          >
            <ShieldAlert className="w-5 h-5" /> Panic Protocol
          </button>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                {session?.user?.name?.[0] || 'S'}
              </div>
              <div className="truncate max-w-[120px]">
                <p className="text-sm font-semibold text-white truncate">{session?.user?.name || 'Student'}</p>
                <p className="text-xs text-slate-500 truncate">{session?.user?.email || 'student@exameve.com'}</p>
              </div>
            </div>
            
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Contents Window */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        {/* Soft atmospheric gradient behind content */}
        <div className="absolute top-[-10%] left-[-10%] right-[-10%] bottom-[-10%] pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent"></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
