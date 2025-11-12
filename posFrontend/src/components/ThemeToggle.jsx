import React, { useEffect, useState } from "react";
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';

export default function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first, then system preference
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) return savedTheme;

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return "dark";
        }
        return "light";
    });

    useEffect(() => {
        const root = document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "dark" ? "light" : "dark");
    };

    return (
        <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-all duration-250 hover:scale-110 active:scale-95 group"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
            <div className="relative w-6 h-6">
                {/* Light Mode Icon */}
                <LightModeRoundedIcon
                    className={`absolute inset-0 transition-all duration-300 text-amber-500 ${
                        theme === "light" 
                            ? "opacity-100 rotate-0 scale-100" 
                            : "opacity-0 rotate-180 scale-0"
                    }`}
                    sx={{ fontSize: 24 }}
                />

                {/* Dark Mode Icon */}
                <DarkModeRoundedIcon
                    className={`absolute inset-0 transition-all duration-300 text-blue-400 ${
                        theme === "dark" 
                            ? "opacity-100 rotate-0 scale-100" 
                            : "opacity-0 -rotate-180 scale-0"
                    }`}
                    sx={{ fontSize: 24 }}
                />
            </div>

            {/* Tooltip on hover */}
            <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
        </button>
    );
}

