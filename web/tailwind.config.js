/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Organic/Natural Earth Palette
        background: '#FDFCF8',      // Off-white, Rice Paper
        foreground: '#2C2C24',      // Deep Loam / Charcoal
        primary: '#5D7052',         // Moss Green
        'primary-foreground': '#F3F4F1', // Pale Mist
        secondary: '#C18C5D',       // Terracotta / Clay
        'secondary-foreground': '#FFFFFF', // White
        accent: '#E6DCCD',          // Sand / Beige
        'accent-foreground': '#4A4A40', // Bark
        muted: '#F0EBE5',          // Stone
        'muted-foreground': '#78786C', // Dried Grass
        border: '#DED8CF',          // Raw Timber
        destructive: '#A85448',     // Burnt Sienna
        card: '#FEFEFA',           // Extremely light beige
      },
      fontFamily: {
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
        serif: ['"Nunito"', 'system-ui', 'sans-serif'],
        display: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'blob-1': '60% 40% 30% 70% / 60% 30% 70% 40%',
        'blob-2': '30% 70% 70% 30% / 30% 30% 70% 70%',
        'blob-3': '70% 30% 50% 50% / 30% 60% 40% 70%',
        'blob-4': '40% 60% 70% 30% / 60% 30% 70% 40%',
        'blob-5': '50% 50% 30% 70% / 50% 70% 30% 50%',
        'blob-6': '65% 35% 45% 55% / 55% 65% 35% 45%',
      },
      boxShadow: {
        // Soft, colored shadows (moss and clay tinted)
        'soft': '0 4px 20px -2px rgba(93, 112, 82, 0.15)',
        'float': '0 10px 40px -10px rgba(193, 140, 93, 0.2)',
        'lift': '0 20px 40px -10px rgba(93, 112, 82, 0.15)',
      },
      animation: {
        'lift': 'lift 300ms ease-out forwards',
        'scale-in': 'scaleIn 500ms ease-out forwards',
      },
      keyframes: {
        lift: {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-4px)' },
        },
        scaleIn: {
          from: { 
            opacity: '0',
            transform: 'scale(0.95)',
          },
          to: { 
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
}
