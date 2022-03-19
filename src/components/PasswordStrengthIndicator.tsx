import React from 'react';
import styled from 'styled-components';
import { Flex } from '../styles';
import { validatePassword } from '../utils/validations';

interface PasswordStrengthProps {
  isActive: boolean;
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

const PasswordStrength = styled.div`
  width: 100%;
  height: 10px;
  flex: 0.75;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.2);
  margin-right: 5px;
  ${(props: PasswordStrengthProps) =>
    props.isActive && `background: rgb(47, 192, 206);`};
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
    },
    setValidations,
  ] = React.useState({ ...validatePassword(value || '') });
  React.useEffect(() => {
    const validationData = validatePassword(value || '');
    setValidations({ ...validationData });
    if (Object.values(validationData).some((isValid) => isValid === false)) {
      setDisableButton(true);
    } else {
      setDisableButton(false);
    }
  }, [value]);
  return (
    <div>
      <PasswordStrengthWrapper>
        <Flex alignItems="center" justifyContent="center" wrap="nowrap">
          <PasswordStrength isActive={score >= 1} />
          <PasswordStrength isActive={score >= 2} />
          <PasswordStrength isActive={score >= 3} />
          <PasswordStrength isActive={score >= 4} />
          <div>{strength}</div>
        </Flex>
      </PasswordStrengthWrapper>
      <p>
        <b>Criteria for a good password:</b>
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
      </Flex>
    </div>
  );
};

export default PasswordStrengthIndicator;
