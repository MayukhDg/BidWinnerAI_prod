const { withUt } = require("uploadthing/tw");

module.exports = withUt({
  content: [
    "./pages/**/*.{js,jsx,mdx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
});
