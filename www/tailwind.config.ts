import type {Config} from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /** Brand yellow (Google Slides–style). Use for primary CTAs and accents. */
        brand: {
          DEFAULT: '#FFBA44',
          hover: 'rgba(255, 186, 68, 0.9)',
        },
        /** Dark heading/ink used in logo, nav, and legal pages. */
        heading: 'rgb(20, 30, 50)',
      },
      fontFamily: {
        /** Inter (loaded in layout) + system fallbacks. */
        sans: [
          'Inter',
          'Roboto',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      boxShadow: {
        /** Card with amber tint (dashboard, home, login). */
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 1px rgb(251 191 36 / 0.08)',
        'card-hover':
          '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 0 0 1px rgb(251 191 36 / 0.1)',
        /** Stronger amber shadow for primary surfaces. */
        brand:
          '0 10px 15px -3px rgb(180 83 9 / 0.15), 0 4px 6px -4px rgb(180 83 9 / 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
