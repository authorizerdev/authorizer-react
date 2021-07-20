import React, { FC } from 'react';
import { IconRoot } from '../components/IconRoot';

export const IconClose: FC<{ height: number; width: number }> = ({
  height,
  width,
  ...rest
}) => (
  <IconRoot
    width={width}
    height={height}
    viewBox="0 0 17.205 16.919"
    style={{ fill: 'currentColor' }}
    {...rest}
  >
    <g
      id="Close_Blip"
      data-name="Close Blip"
      transform="translate(2.121 2.121)"
    >
      <line
        id="Line_139"
        data-name="Line 139"
        x2="12.963"
        y2="12.677"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <line
        id="Line_140"
        data-name="Line 140"
        y1="12.677"
        x2="12.963"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </g>
  </IconRoot>
);
