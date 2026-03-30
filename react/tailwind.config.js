/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        card: '#0f1f35',
        accent: '#15b097',
        highlight: '#f4b266',
      },
      boxShadow: {
        glow: '0 30px 80px -35px rgba(21, 176, 151, 0.8)',
      },
      keyframes: {
        liftIn: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeRise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'lift-in': 'liftIn 480ms ease-out both',
        'fade-rise': 'fadeRise 400ms ease-out both',
      },
    },
  },
  plugins: [],
};
