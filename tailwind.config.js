/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Anthropic-inspired warm palette
        primary: {
          50: '#FDF8F3',
          100: '#F9EDE0',
          200: '#F2D9BF',
          300: '#E8BF95',
          400: '#D9996A',
          500: '#C87B4A',
          600: '#B5693D',
          700: '#955434',
          800: '#7A452E',
          900: '#653A28',
        },
        accent: {
          50: '#FFF8F0',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        sand: {
          50: '#FDFCFA',
          100: '#F9F6F1',
          200: '#F3EDE4',
          300: '#E8DFD2',
          400: '#D4C7B5',
          500: '#B8A898',
          600: '#9A8B7A',
          700: '#7D6F60',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};
