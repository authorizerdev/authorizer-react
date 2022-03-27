import { theme } from '../styles/theme';
import { ThemePropsType } from '../types';

export const buildTheme = (customTheme: ThemePropsType | null) => {
  return customTheme
    ? {
        ...theme,
        ...customTheme,
        colors: { ...theme.colors, ...customTheme.colors },
        fonts: { ...theme.fonts, ...customTheme.fonts },
        radius: { ...theme.radius, ...customTheme.radius },
      }
    : theme;
};
