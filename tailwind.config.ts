import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // All colors reference CSS custom properties from theme.css
        // Change the theme by editing theme.css — no code changes needed
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        primary: 'var(--color-primary)',
        'primary-dim': 'var(--color-primary-dim)',
        accent: 'var(--color-accent)',
        'accent-dim': 'var(--color-accent-dim)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 12px var(--color-primary-dim)',
        'glow-accent': '0 0 12px var(--color-accent-dim)',
        'glow-danger': '0 0 12px rgba(239,68,68,0.4)',
      },
    },
  },
  plugins: [],
}

export default config
