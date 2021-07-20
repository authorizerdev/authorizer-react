import { css, CSSObject } from 'styled-components';

export const sizes: any = {
  sm: 576,
  md: 768,
  lg: 992,
};

export const xs = {
  maxWidth: sizes.sm - 1,
};

export const sm = {
  minWidth: sizes.sm,
  maxWidth: sizes.md - 1,
};

export const md = {
  minWidth: sizes.md,
  maxWidth: sizes.lg - 1,
};

export const lg = {
  minWidth: sizes.lg,
};

export const media = Object.keys(sizes).reduce((acc: any, label: string) => {
  acc[label] = (args: CSSObject | TemplateStringsArray) =>
    css`
      @media (min-width: ${sizes[label] / 16}em) {
        ${css(args)}
      }
    `;
  return acc;
}, {});
