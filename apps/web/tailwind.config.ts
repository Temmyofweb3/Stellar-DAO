import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        stellar: {
          ink: '#05070d',
          slate: '#0d111c',
          midnight: '#111728',
          steel: '#1b233a',
          haze: '#9aa3bd',
          cloud: '#dde3f5',
          aurora: '#7c5cff',
          nova: '#22d3ee',
          comet: '#f7b955',
          flare: '#ff6b6b',
        },
      },
      backgroundImage: {
        'aurora-gradient':
          'radial-gradient(120% 80% at 50% -20%, rgba(124,92,255,0.45) 0%, rgba(34,211,238,0.20) 35%, rgba(5,7,13,0.0) 70%), linear-gradient(180deg, #05070d 0%, #0a0e1c 100%)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.95' },
          '50%': { opacity: '0.55' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 8s linear infinite',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,0.25), 0 30px 80px -40px rgba(124,92,255,0.55)',
        card: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 12px 40px -20px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
