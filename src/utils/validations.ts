export const isValidEmail = (email: string): boolean => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email.trim()).toLowerCase());
};

export const validatePassword = (
  value: string
): {
  score: number;
  strength: string;
  hasSixChar: boolean;
  hasLowerCase: boolean;
  hasUpperCase: boolean;
  hasNumericChar: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
} => {
  const res = {
    score: 0,
    strength: '',
    hasSixChar: false,
    hasLowerCase: false,
    hasUpperCase: false,
    hasNumericChar: false,
    hasSpecialChar: false,
  };

  const lowerChar = /(?=.*[a-z])/;
  const upperChar = /(?=.*[A-Z])/;
  const number = /(?=.*\d)/;
  const specialChar = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  if (value.length >= 6) {
    // Update score and add class
    res.score = res.score + 1;
    res.hasSixChar = true;
  }

  if (lowerChar.test(value)) {
    // Update score and add class
    res.score = res.score + 0.7;
    res.hasLowerCase = true;
  }

  if (upperChar.test(value)) {
    // Update score and add class
    res.score = res.score + 0.7;
    res.hasUpperCase = true;
  }

  if (number.test(value)) {
    res.score = res.score + 0.6;
    res.hasNumericChar = true;
  }

  if (specialChar.test(value)) {
    res.score = res.score + 1;
    res.hasSpecialChar = true;
  }
  switch (Math.trunc(res.score)) {
    case 1:
      res.strength = 'Poor';
      break;
    case 2:
      res.strength = 'Okay';
      break;
    case 3:
      res.strength = 'Good';
      break;
    case 4:
      res.strength = 'Great';
      break;
    default:
      if (value.trim()) {
        res.strength = 'Poor';
      } else {
        res.strength = '';
      }
  }
  const isValid = Object.values(res).every((i) => Boolean(i));
  return { ...res, isValid };
};
