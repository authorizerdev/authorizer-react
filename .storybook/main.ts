import type { StorybookConfig } from '@storybook/react-webpack5';
import type { WebpackConfiguration } from '@storybook/core-webpack';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    '@storybook/addon-onboarding',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/preset-scss',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      strictMode: true,
    },
  },
  // Match the automatic JSX runtime used by tsconfig ("jsx": "react-jsx") so
  // story files don't need an explicit `import React`.
  swc: (swcConfig) => ({
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      transform: {
        ...swcConfig.jsc?.transform,
        react: {
          ...swcConfig.jsc?.transform?.react,
          runtime: 'automatic',
        },
      },
    },
  }),
  webpackFinal: async (currentConfig: WebpackConfiguration, { configType }) => {
    // get index of css rule
    const ruleCssIndex = currentConfig.module.rules.findIndex(
      (rule) => rule.test?.toString() === '/\\.css$/'
    );

    // map over the 'use' array of the css rule and set the 'module' option to true
    currentConfig.module.rules[ruleCssIndex].use.map((item) => {
      if (item.loader && item.loader.includes('/css-loader/')) {
        item.options.modules = {
          // The library ships default.css as a plain global stylesheet
          // (consumers import it directly), so its class names must NOT be
          // scoped/hashed or component className strings won't match. Keep
          // everything else as local CSS modules.
          mode: (resourcePath: string) =>
            resourcePath.replace(/\\/g, '/').endsWith('styles/default.css')
              ? 'global'
              : 'local',
          localIdentName:
            configType === 'PRODUCTION'
              ? '[local]__[hash:base64:5]'
              : '[name]__[local]__[hash:base64:5]',
        };
      }

      return item;
    });

    return currentConfig;
  },
};
export default config;
