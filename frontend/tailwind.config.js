/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        accent: {
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
        },
        surface: {
          0: 'rgb(var(--surface-0) / <alpha-value>)',
          50: 'rgb(var(--surface-50) / <alpha-value>)',
          100: 'rgb(var(--surface-100) / <alpha-value>)',
          200: 'rgb(var(--surface-200) / <alpha-value>)',
          300: 'rgb(var(--surface-300) / <alpha-value>)',
          400: 'rgb(var(--surface-400) / <alpha-value>)',
          500: 'rgb(var(--surface-500) / <alpha-value>)',
        },
        txt: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        success: {
          400: 'rgb(var(--success-400) / <alpha-value>)',
          500: 'rgb(var(--success-500) / <alpha-value>)',
          600: 'rgb(var(--success-600) / <alpha-value>)',
        },
        warning: {
          400: 'rgb(var(--warning-400) / <alpha-value>)',
          500: 'rgb(var(--warning-500) / <alpha-value>)',
        },
        danger: {
          400: 'rgb(var(--danger-400) / <alpha-value>)',
          500: 'rgb(var(--danger-500) / <alpha-value>)',
          600: 'rgb(var(--danger-600) / <alpha-value>)',
        },
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s var(--ease-out-expo) both',
        'slide-up': 'slide-up 0.5s var(--ease-out-expo) both',
        'slide-down': 'slide-down 0.5s var(--ease-out-expo) both',
        'slide-in-right': 'slide-in-right 0.4s var(--ease-out-expo) both',
        'scale-in': 'scale-in 0.3s var(--ease-spring) both',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'bounce-slow': 'float 2s ease-in-out infinite',
        'count-up': 'count-up 0.6s var(--ease-out-expo) both',
        'progress-fill': 'progress-fill 1s var(--ease-out-expo) both',
      },
      boxShadow: {
        'glass': 'var(--glass-shadow)',
        'glow-brand': '0 0 20px rgba(56, 117, 250, 0.3), 0 0 60px rgba(56, 117, 250, 0.1)',
        'glow-accent': '0 0 20px rgba(6, 182, 212, 0.3), 0 0 60px rgba(6, 182, 212, 0.1)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.1)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
        'gradient-accent': 'linear-gradient(135deg, rgb(var(--brand-500)), rgb(var(--accent-500)))',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
