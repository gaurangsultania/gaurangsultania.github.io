/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        border: '#1f1f1f',
        accent: '#e5e5e5',
        muted: '#7a7a7a',
        canvas:  '#0d0c0a',
        cream:   '#e8e4dc',
        gold:    '#c8a96e',
        stone:   '#a09a94',
        dim:     '#3a3832',
      },
      letterSpacing: {
        widest2: '0.15em',
      },
    },
  },
  plugins: [],
}
