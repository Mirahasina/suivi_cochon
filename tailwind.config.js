module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#1B4332",
                secondary: "#D4AF37",
                background: "#F8F9FA",
                text: "#212529",
                border: "#DEE2E6",
                gold: "#B8860B",
                success: "#2D6A4F",
                danger: "#D00000",
            },
        },
    },
    plugins: [],
};
