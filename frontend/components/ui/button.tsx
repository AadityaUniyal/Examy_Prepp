import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({ 
  className = '', 
  variant = 'default', 
  size = 'default',
  ...props 
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    link: 'text-indigo-600 underline-offset-4 hover:underline',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  }

  const sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-9 rounded-md px-3 text-xs',
    lg: 'h-11 rounded-md px-8 text-base',
    icon: 'h-10 w-10'
  }

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
