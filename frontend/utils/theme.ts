export type ThemeName = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'appTheme';

export function applyTheme(theme: ThemeName) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function getStoredTheme(): ThemeName | null {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
}
