/** @type {import('tailwindcss').Config} */

function parentSiblingHoverPlugin({ addVariant, e }) {
  addVariant('parent-sibling-hover', ({ modifySelectors, separator }) => {
    modifySelectors(({ className }) => {
      return `.parent-sibling:hover ~ .parent .${e(
        `parent-sibling-hover${separator}${className}`
      )}`;
    });
  });
}

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: [
        'Open Sans',
        'Monserat',
      ],
      mono: ['Source Code Pro', 'monospace'],
    },
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // Smaller, more reasonable heading sizes
            h1: {
              fontSize: '1.5rem',    // 24px
              fontWeight: '600',
              marginTop: '1.2rem',
              marginBottom: '0.8rem'
            },
            h2: {
              fontSize: '1.25rem',   // 20px
              fontWeight: '600',
              marginTop: '1rem',
              marginBottom: '0.6rem'
            },
            h3: {
              fontSize: '1.1rem',    // 17.6px
              fontWeight: '600',
              marginTop: '0.8rem',
              marginBottom: '0.4rem'
            },
            // You can also customize h4, h5, h6 if needed
            pre: { padding: 0, margin: 0 },
            ul: {
              'list-style-type': 'none',
            },
          },
        },
      },
      colors: {
        gray: {
          50: '#f7f7f8',
          100: '#ececf1',
          200: '#d9d9e3',
          300: '#d1d5db',
          400: '#acacbe',
          500: '#8e8ea0',
          600: '#4b5563',
          650: '#444654',
          700: '#40414f',
          800: '#343541',
          850: '#2A2B32',
          900: '#202123',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), parentSiblingHoverPlugin],
  darkMode: 'class',
};
