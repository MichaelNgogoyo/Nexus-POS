import {useEffect, useMemo, useState} from "react";
import {CheckCircleRounded, DarkModeRounded, LightModeRounded, PaletteRounded} from "@mui/icons-material";
import {
    getCurrentThemeState,
    setThemeMode,
    setThemePreset,
    subscribeToThemeChanges,
    THEME_PRESETS
} from "../../theme/theme";

const THEME_DESCRIPTIONS = {
    apple: "Clean, premium neutral palette with subtle blue accents.",
    executive: "Professional blue-forward visual language for enterprise operations.",
    charcoal: "High-contrast dark-first command center style.",
    emerald: "Finance-friendly green-accent theme for operational reporting.",
    sapphire: "Balanced enterprise blues for operations-heavy teams.",
    platinum: "Minimal neutral slate style for distraction-free workflows.",
};

const THEME_SWATCHES = {
    apple: ["#0071e3", "#f5f5f7", "#1d1d1f"],
    executive: ["#2563eb", "#f4f7fb", "#10243e"],
    charcoal: ["#8aa4ff", "#191a1d", "#f3f4f6"],
    emerald: ["#0f766e", "#f5fbf8", "#0f2d23"],
    sapphire: ["#3558d8", "#f3f6fc", "#12233f"],
    platinum: ["#475569", "#f7f7f8", "#1f2328"],
};

function Settings() {
    const [themeState, setThemeState] = useState(() => getCurrentThemeState());

    useEffect(() => {
        return subscribeToThemeChanges((event) => {
            setThemeState(event.detail);
        });
    }, []);

    const presets = useMemo(() => Object.entries(THEME_PRESETS), []);

    const handlePresetChange = (presetKey) => {
        const next = setThemePreset(presetKey);
        setThemeState(next);
    };

    const handleModeChange = (mode) => {
        const next = setThemeMode(mode);
        setThemeState(next);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
                <p className="mt-1 text-text-secondary">
                    Choose your POS visual style and appearance mode.
                </p>
            </div>

            <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <PaletteRounded className="text-brand-primary"/>
                    <h2 className="text-xl font-semibold">Theme Presets</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {presets.map(([key, preset]) => {
                        const isActive = themeState.preset === key;

                        return (
                            <button
                                key={key}
                                onClick={() => handlePresetChange(key)}
                                className={`text-left rounded-xl border p-4 transition-all duration-250 ${
                                    isActive
                                        ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-bg-tertiary'
                                        : 'border-border-primary hover:bg-bg-tertiary'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-text-primary">{preset.label}</p>
                                        <p className="mt-1 text-sm text-text-secondary">{THEME_DESCRIPTIONS[key]}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            {THEME_SWATCHES[key]?.map((color) => (
                                                <span
                                                    key={`${key}-${color}`}
                                                    className="h-4 w-4 rounded-full border border-border-primary"
                                                    style={{backgroundColor: color}}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {isActive && <CheckCircleRounded className="text-brand-primary"/>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="card p-5">
                <h2 className="text-xl font-semibold mb-4">Appearance Mode</h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleModeChange('light')}
                        className={`btn-secondary flex items-center gap-2 ${themeState.mode === 'light' ? 'ring-2 ring-brand-primary' : ''}`}
                    >
                        <LightModeRounded sx={{fontSize: 20}}/>
                        Light
                    </button>
                    <button
                        onClick={() => handleModeChange('dark')}
                        className={`btn-secondary flex items-center gap-2 ${themeState.mode === 'dark' ? 'ring-2 ring-brand-primary' : ''}`}
                    >
                        <DarkModeRounded sx={{fontSize: 20}}/>
                        Dark
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;
