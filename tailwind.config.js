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
        accent:  '#c8a96e',
        stone:   '#a09a94',   // muted/secondary text
        muted:   '#a09a94',   // alias — same as stone
        surface: '#131210',
        border:  '#2a2825',
        dim:     '#3a3832',   // borders and dividers only
      },
      letterSpacing: {
        widest2: '0.15em',
      },
    },
  },
  plugins: [],
}
