/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/**/*.{html,js,ejs}",
            "./views/**/*.ejs"
    ],
    theme: {
        extend: {
        fontFamily: {
            playwrite: ["Poppins", "mono"],
        },
        },
    },
    plugins: [require("@tailwindcss/forms")],
    }