/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                primary: '#000000',
                secondary: '#ffffff',
                // 스테이시즌 영역 전용 (stay-season.com 기준)
                season: {
                    brown: '#433C37',
                    ink: '#212121',
                    beige: '#EFEEE9',
                    sand: '#E5E3DE',
                    stone: '#D9D4D0',
                    line: '#D2D2D2',
                    accent: '#C8835E',
                },
                gray: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
            },
        },
    },
    plugins: [],
};
