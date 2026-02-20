export const THEME_PRESETS = {
    apple: {
        label: 'Apple Style',
        className: 'theme-apple',
    },
    executive: {
        label: 'Executive Blue',
        className: 'theme-executive',
    },
    charcoal: {
        label: 'Charcoal Pro',
        className: 'theme-charcoal',
    },
    emerald: {
        label: 'Emerald Finance',
        className: 'theme-emerald',
    },
};

const PRESET_STORAGE_KEY = 'ui-theme-preset';
const MODE_STORAGE_KEY = 'ui-color-mode';
const THEME_EVENT = 'app-theme-change';

const getSystemMode = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

const normalizePreset = (preset) => {
    return THEME_PRESETS[preset] ? preset : 'apple';
};

const normalizeMode = (mode) => {
    return mode === 'dark' ? 'dark' : 'light';
};

const dispatchThemeEvent = () => {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, {detail: getCurrentThemeState()}));
};

export const getCurrentThemeState = () => {
    const savedPreset = localStorage.getItem(PRESET_STORAGE_KEY);
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);

    return {
        preset: normalizePreset(savedPreset || 'apple'),
        mode: normalizeMode(savedMode || getSystemMode()),
    };
};

export const applyTheme = ({preset, mode}) => {
    const root = document.documentElement;
    const nextPreset = normalizePreset(preset);
    const nextMode = normalizeMode(mode);

    Object.values(THEME_PRESETS).forEach((theme) => {
        root.classList.remove(theme.className);
    });

    root.classList.add(THEME_PRESETS[nextPreset].className);

    if (nextMode === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    localStorage.setItem(PRESET_STORAGE_KEY, nextPreset);
    localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    dispatchThemeEvent();

    return {preset: nextPreset, mode: nextMode};
};

export const initTheme = () => {
    return applyTheme(getCurrentThemeState());
};

export const setThemePreset = (preset) => {
    const current = getCurrentThemeState();
    return applyTheme({preset, mode: current.mode});
};

export const setThemeMode = (mode) => {
    const current = getCurrentThemeState();
    return applyTheme({preset: current.preset, mode});
};

export const toggleThemeMode = () => {
    const current = getCurrentThemeState();
    const nextMode = current.mode === 'dark' ? 'light' : 'dark';
    return applyTheme({preset: current.preset, mode: nextMode});
};

export const subscribeToThemeChanges = (listener) => {
    window.addEventListener(THEME_EVENT, listener);
    return () => window.removeEventListener(THEME_EVENT, listener);
};
