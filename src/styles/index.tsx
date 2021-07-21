import styled, { css } from 'styled-components';
import { ButtonAppearance, MessageType } from '../constants';
import { media } from './media';

type FlexProps = {
  wrap?: string;
  alignItems?: string;
  flexDirection?: string;
  isResponsive?: boolean;
  justifyContent?: string;
  height?: string;
  width?: string;
};

export const Wrapper = styled.div`
  font-family: ${(props) => props.theme.fonts.fontStack};
  color: ${(props) => props.theme.colors.textColor};
  font-size: ${(props) => props.theme.fonts.mediumText};
  box-sizing: border-box;

  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }
`;

export const Required = styled.span`
  color: ${(props) => props.theme.colors.danger};
  padding-right: 3px;
`;

export const Error = styled.div`
  color: ${(props) => props.theme.colors.danger};
  font-size: ${(props) => props.theme.fonts.smallText};
`;

export const FieldWrapper = styled.div`
  margin-bottom: 15px;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 3px;
`;

export const Input = styled.input<{ hasError: boolean }>`
  padding: 10px;
  border-radius: ${(props) => props.theme.radius.input};
  width: 100%;
  border-color: ${(props) =>
    props.hasError ? props.theme.colors.danger : props.theme.colors.primary};
  outline-color: ${(props) =>
    props.hasError ? props.theme.colors.danger : props.theme.colors.primary};
`;

export const Button = styled.button<{ appearance: ButtonAppearance }>`
  padding: 15px 10px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${(props) =>
    props.appearance === ButtonAppearance.Primary
      ? props.theme.colors.primary
      : 'white'};
  color: ${(props) =>
    props.appearance === ButtonAppearance.Default
      ? props.theme.colors.textColor
      : 'white'};
  border-radius: ${(props) => props.theme.radius.button};
  border-color: ${(props) => props.theme.colors.textColor};
  border: ${(props) =>
    props.appearance === ButtonAppearance.Primary ? '0px' : '1px'};
  border-style: solid;
  cursor: pointer;
  position: relative;

  &:disabled {
    cursor: not-allowed;
    background-color: ${(props) => props.theme.colors.primaryDisabled};
  }

  svg {
    position: absolute;
    left: 10px;
  }
`;

export const Link = styled.span`
  color: ${(props) => props.theme.colors.primary};
  cursor: pointer;
`;

export const Separator = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 10px 0px;

  ::before {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${(props) => props.theme.colors.gray};
  }

  ::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${(props) => props.theme.colors.gray};
  }

  :not(:empty)::before {
    margin-right: 0.25em;
  }

  :not(:empty)::after {
    margin-left: 0.25em;
  }
`;

export const Footer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 15px;
`;

export const MessageWrapper = styled.div<{ type: MessageType }>`
  padding: 10px;
  color: white;
  border-radius: ${(props) => props.theme.radius.card};
  margin: 10px 0px;
  font-size: ${(props) => props.theme.fonts.smallText};
  ${(props) =>
    props.type === MessageType.Error &&
    `
    background-color: ${props.theme.colors.danger};
  `}
  ${(props) =>
    props.type === MessageType.Success &&
    `
    background-color: ${props.theme.colors.success};
  `};
`;

export const Flex = styled.div`
  display: flex;
  flex-direction: ${({ flexDirection, isResponsive }: FlexProps) =>
    isResponsive && flexDirection !== 'column'
      ? 'column'
      : flexDirection || 'row'};
  flex-wrap: ${({ wrap }: FlexProps) => wrap || 'wrap'};
  ${({ alignItems }) =>
    alignItems &&
    css`
      align-items: ${alignItems};
    `};
  ${({ justifyContent }: FlexProps) =>
    justifyContent &&
    css`
      justify-content: ${justifyContent};
    `};
  ${media.lg`
    flex-direction: ${({ flexDirection }: FlexProps) => flexDirection || 'row'}
  `}
`;
