/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',

        // Text colors
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',

        // Brand colors
        'brand-primary': 'var(--color-brand-primary)',
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-hover': 'var(--color-brand-hover)',

        // Accent colors
        'accent-success': 'var(--color-accent-success)',
        'accent-warning': 'var(--color-accent-warning)',
        'accent-error': 'var(--color-accent-error)',

        // Border colors
        'border-primary': 'var(--color-border-primary)',
        'border-secondary': 'var(--color-border-secondary)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
