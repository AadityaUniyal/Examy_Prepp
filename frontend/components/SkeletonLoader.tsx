'use client'

import React from 'react'

export default function SkeletonLoader() {
  return (
    <div className="w-full bg-[rgb(var(--surface-0))]/80 border border-slate-200/80 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-slate-800 rounded-md w-1/3 mb-6"></div>
      <div className="flex items-end justify-between h-48 gap-3 mt-4">
        <div className="bg-slate-800 rounded w-full h-1/3"></div>
        <div className="bg-slate-800 rounded w-full h-2/3"></div>
        <div className="bg-slate-800 rounded w-full h-1/2"></div>
        <div className="bg-slate-800 rounded w-full h-3/4"></div>
        <div className="bg-slate-800 rounded w-full h-5/6"></div>
        <div className="bg-slate-800 rounded w-full h-1/4"></div>
        <div className="bg-slate-800 rounded w-full h-4/5"></div>
      </div>
    </div>
  )
}
