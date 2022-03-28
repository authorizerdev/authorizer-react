import { theme } from '../styles/theme';
import { ThemePropsType } from '../types';

export const buildTheme = (customTheme?: ThemePropsType | null) =>
  customTheme
    ? {
        ...theme,
        ...customTheme,
        colors: { ...theme.colors, ...customTheme.colors },
        fonts: { ...theme.fonts, ...customTheme.fonts },
        radius: { ...theme.radius, ...customTheme.radius },
        background: {
          ...theme.background,
          ...customTheme.background,
        },
      }
    : theme;
