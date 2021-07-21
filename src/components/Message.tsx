import React, { FC } from 'react';
import { MessageType } from '../constants';
import { IconClose } from '../icons/close';
import { MessageWrapper, Flex } from '../styles';
import { capitalizeFirstLetter } from '../utils/format';

type Props = {
  type: MessageType;
  text: string;
  onClose?: () => void;
};

export const Message: FC<Props> = ({ type, text, onClose }) => {
  if (text.trim()) {
    return (
      <MessageWrapper type={type}>
        <Flex alignItems="center" justifyContent="space-between">
          <div style={{ flex: 1 }}>{capitalizeFirstLetter(text)}</div>
          {onClose && (
            <span style={{ cursor: 'pointer' }} onClick={onClose}>
              <IconClose height={10} width={10} />
            </span>
          )}
        </Flex>
      </MessageWrapper>
    );
  }

  return null;
};
