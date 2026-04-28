/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        canvas:  '#0d0c0a',
        cream:   '#e8e4dc',
        gold:    '#c8a96e',
        stone:   '#3a3832',
      },
      letterSpacing: {
        widest2: '0.15em',
      },
    },
  },
  plugins: [],
}
