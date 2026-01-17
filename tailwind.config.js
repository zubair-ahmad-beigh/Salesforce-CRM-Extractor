/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/popup/**/*.{js,jsx,html}",
        "./src/injected-ui/**/*.{js,html}"
    ],
    theme: {
        extend: {
            colors: {
                salesforce: {
                    blue: '#0176d3',
                    darkblue: '#032d60',
                    lightblue: '#e3f3ff'
                }
            }
        }
    },
    plugins: []
};
