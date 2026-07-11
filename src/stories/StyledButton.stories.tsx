import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import StyledButton from '../styledComponents/StyledButton';
import { ButtonAppearance } from '../constants';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<typeof StyledButton> = {
  title: 'Example/StyledButton',
  component: StyledButton,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  argTypes: {
    appearance: {
      control: 'select',
      options: [ButtonAppearance.Default, ButtonAppearance.Primary]
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset']
    }
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { 
    onClick: fn(),
    type: 'button'
  },
};

export default meta;
type Story = StoryObj<typeof StyledButton>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    appearance: ButtonAppearance.Default,
    children: 'Default Button'
  },
};

export const Primary: Story = {
  args: {
    appearance: ButtonAppearance.Primary,
    children: 'Primary Button'
  },
};

export const DefaultDisabled: Story = {
  args: {
    appearance: ButtonAppearance.Default,
    children: 'Primary Button',
    disabled: true
  },
};

export const PrimaryDisabled: Story = {
  args: {
    appearance: ButtonAppearance.Primary,
    children: 'Primary Button',
    disabled: true
  },
};
