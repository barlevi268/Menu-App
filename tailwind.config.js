const { heroui, colors } = require("@heroui/theme");

module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        colors: {
          'orange-extra-light': 'rgb(255 251 247)',
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
