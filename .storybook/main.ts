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
    '@storybook/addon-styling-webpack',
    '@storybook/preset-scss'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      strictMode: true,
    },
  },
  webpackFinal: async (currentConfig: WebpackConfiguration, { configType }) => {
    // get index of css rule
    const ruleCssIndex = currentConfig.module.rules.findIndex(
      (rule) => rule.test?.toString() === "/\\.css$/"
    );

    // map over the 'use' array of the css rule and set the 'module' option to true
    currentConfig.module.rules[ruleCssIndex].use.map((item) => {
      if (item.loader && item.loader.includes("/css-loader/")) {
        item.options.modules = {
          mode: "local",
          localIdentName:
            configType === "PRODUCTION"
              ? "[local]__[hash:base64:5]"
              : "[name]__[local]__[hash:base64:5]",
        };
      }

      return item;
    });

    return currentConfig;
  },
};
export default config;
