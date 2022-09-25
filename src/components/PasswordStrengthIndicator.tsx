import React from 'react';
import styled from 'styled-components';
import { Flex } from '../styles';
import { validatePassword } from '../utils/validations';

interface PasswordStrengthProps {
  strength: string;
}

interface PropTypes {
  value: string;
  setDisableButton: Function;
}

const StyledCheckBoxLabel = styled.div`
  margin-left: 5px;
`;

const PasswordStrengthWrapper = styled.div`
  margin: 2% 0 0;
`;

// TODO use based on theme primary color
const passwordStrengthIndicatorOpacity: Record<string, number> = {
  default: 0.15,
  weak: 0.4,
  good: 0.6,
  strong: 0.8,
  veryStrong: 1,
};

const PasswordStrength = styled.div`
  width: 100%;
  height: 10px;
  flex: 0.75;
  border-radius: 5px;
  margin-right: 5px;
  background-color: ${(props) => props.theme.colors.primary};
  opacity: ${(props: PasswordStrengthProps) =>
    passwordStrengthIndicatorOpacity[props.strength]};
`;

const PasswordStrengthIndicator = ({ value, setDisableButton }: PropTypes) => {
  const [
    {
      strength,
      score,
      hasSixChar,
      hasLowerCase,
      hasNumericChar,
      hasSpecialChar,
      hasUpperCase,
      maxThirtySixChar,
    },
    setValidations,
  ] = React.useState({ ...validatePassword(value || '') });

  React.useEffect(() => {
    const validationData = validatePassword(value || '');
    setValidations({ ...validationData });
    if (!validationData.isValid) {
      setDisableButton(true);
    } else {
      setDisableButton(false);
    }
  }, [value]);

  return (
    <div>
      <PasswordStrengthWrapper>
        <Flex alignItems="center" justifyContent="center" wrap="nowrap">
          <PasswordStrength strength={score > 2 ? `weak` : `default`} />
          <PasswordStrength strength={score > 3 ? `good` : `default`} />
          <PasswordStrength strength={score > 4 ? `strong` : `default`} />
          <PasswordStrength strength={score > 5 ? `veryStrong` : `default`} />
          {!!score && <div>{strength}</div>}
        </Flex>
      </PasswordStrengthWrapper>
      <p>
        <b>Criteria for a strong password:</b>
      </p>
      <Flex flexDirection="column">
        <Flex justifyContent="start" alignItems="center">
          <input readOnly type="checkbox" checked={hasSixChar} />
          <StyledCheckBoxLabel>At least 6 characters</StyledCheckBoxLabel>
        </Flex>
        <Flex justifyContent="start" alignItems="center">
          <input readOnly type="checkbox" checked={hasLowerCase} />
          <StyledCheckBoxLabel>At least 1 lowercase letter</StyledCheckBoxLabel>
        </Flex>
        <Flex justifyContent="start" alignItems="center">
          <input readOnly type="checkbox" checked={hasUpperCase} />
          <StyledCheckBoxLabel>At least 1 uppercase letter</StyledCheckBoxLabel>
        </Flex>
        <Flex justifyContent="start" alignItems="center">
          <input readOnly type="checkbox" checked={hasNumericChar} />
          <StyledCheckBoxLabel>
            At least 1 numeric character
          </StyledCheckBoxLabel>
        </Flex>
        <Flex justifyContent="start" alignItems="center">
          <input readOnly type="checkbox" checked={hasSpecialChar} />
          <StyledCheckBoxLabel>
            At least 1 special character
          </StyledCheckBoxLabel>
        </Flex>
        <Flex justifyContent="start" alignItems="center">
          <input readOnly type="checkbox" checked={maxThirtySixChar} />
          <StyledCheckBoxLabel>Maximum 36 characters</StyledCheckBoxLabel>
        </Flex>
      </Flex>
    </div>
  );
};

export default PasswordStrengthIndicator;
