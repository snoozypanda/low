/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#43B02A',
          dark: '#2E7D1E',
          deep: '#1F4D16',
          tint: '#EAF6E5',
          soft: '#F3FAF0',
        },
        ink: {
          DEFAULT: '#1F2933',
          muted: '#6B7280',
          soft: '#9AA3AE',
        },
        accent: '#E4002B',
        page: '#F5F7F5',
        line: '#E6EAE5',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
        ethiopic: ['"Noto Sans Ethiopic"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,41,51,0.04), 0 8px 24px rgba(31,41,51,0.05)',
        phone: '0 40px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
        float: '0 18px 50px rgba(20,40,25,0.22)',
      },
      borderRadius: {
        xl2: '16px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop': {
          '0%': { transform: 'scale(.92)', opacity: '0' },
          '70%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'slide-up': 'slide-up .28s cubic-bezier(.22,.9,.3,1)',
        'fade-in': 'fade-in .2s ease-out',
        pop: 'pop .4s cubic-bezier(.22,.9,.3,1)',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
