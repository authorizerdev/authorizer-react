import React, { FC } from 'react';

const rootStyle = { userSelect: 'none' };

export const IconRoot: FC<any> = ({
  height,
  width,
  viewBox,
  children,
  style,
  ...rest
}) => {
  const composedStyle = { ...rootStyle, ...style };

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      style={composedStyle}
      {...rest}
    >
      {children}
    </svg>
  );
};

IconRoot.defaultProps = {
  height: 16,
  width: 16,
};
