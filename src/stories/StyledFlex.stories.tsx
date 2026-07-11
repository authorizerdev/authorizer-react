import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import StyledFlex from '../styledComponents/StyledFlex';

type TemplateArgs = React.ComponentProps<typeof StyledFlex>;
 
const meta: Meta<TemplateArgs> = {
  title: 'Example/StyledFlex',
  component: StyledFlex,
  argTypes: {
    flexDirection: {
      control: 'select',
      options: ['row', 'row-reverse', 'column', 'column-reverse']
    },
    wrap: {
      control: 'select',
      options: ['nowrap', 'wrap', 'wrap-reverse']
    },
    children: Element
  },
  args: { 
    flexDirection: 'row',
    wrap: 'nowrap'
  },
  render: ({...args}) => (
    <StyledFlex {...args}>
       <input type="checkbox" />
        <div>At least 6 characters</div>
    </StyledFlex>
  )
};

export default meta;
type Story = StoryObj<TemplateArgs>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const RowStyledFlex: Story = {
  args: {
    flexDirection: 'row',
    wrap: 'nowrap',
  },
};

export const ColumnStyledFlex: Story = {
  args: {
    flexDirection: 'column',
    wrap: 'nowrap'
  },
};
