/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Nexlm "ledger" palette — shared with the pitch reel and landing site.
        ground: '#070b09',
        ink: '#0c1310',
        panel: '#13201a',
        raised: '#182822',
        line: '#22342b',
        paper: '#e9eee4',
        soft: '#c4cdc2',
        moss: '#7b8a80',
        leaf: '#16a05d',
        mint: '#3fd08a',
        gold: '#f3c44b',
        ember: '#e0654f',
        frost: '#9ec3ff',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"Cascadia Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
