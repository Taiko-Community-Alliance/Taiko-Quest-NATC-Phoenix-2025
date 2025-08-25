/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./docs/**/*.html",
    "./docs/**/*.js",          // include header.js, user-common.js, admin-common.js
  ],
  theme: { extend: {} },
  plugins: [],
}