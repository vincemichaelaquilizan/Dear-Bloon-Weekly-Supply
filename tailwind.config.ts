import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bloom: {
          50:  '#fdf4f8',
          100: '#fce8f2',
          200: '#f9d1e6',
          300: '#f4acd1',
          400: '#ec7db6',
          500: '#e0549b',
          600: '#cc347e',
          700: '#b02666',
          800: '#922255',
          900: '#7a2049',
          950: '#490d2a',
        },
        petal: {
          50:  '#fff8f0',
          100: '#ffefd8',
          200: '#ffdcad',
          300: '#ffc376',
          400: '#ffa03d',
          500: '#ff7f17',
          600: '#f0600d',
          700: '#c7440d',
          800: '#9e3613',
          900: '#7f2e13',
        },
        leaf: {
          50:  '#f3faf3',
          100: '#e3f5e3',
          200: '#c8eac9',
          300: '#9dd89f',
          400: '#6abf6d',
          500: '#45a349',
          600: '#348538',
          700: '#2b6a2f',
          800: '#265529',
          900: '#214624',
        },
        sage: {
          50:  '#f6f8f5',
          100: '#e9efe6',
          200: '#d3dfcd',
          300: '#b0c4a7',
          400: '#88a47c',
          500: '#68875b',
          600: '#526c47',
          700: '#41563a',
          800: '#364630',
          900: '#2d3a28',
        }
      },
      boxShadow: {
        'petal': '0 2px 16px 0 rgba(224, 84, 155, 0.12)',
        'petal-lg': '0 8px 32px 0 rgba(224, 84, 155, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pop': 'pop 0.18s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(0.92)' }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
} satisfies Config
