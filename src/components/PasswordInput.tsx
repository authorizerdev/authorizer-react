import { FC, useState } from 'react';
import { IconEye, IconEyeOff } from '../icons/eye';

// Shared by every real password field (login, signup, reset password) - not
// used for the OTP code input, which is masked with type="password" for the
// same visual treatment but isn't a password a user would want to reveal.
export const PasswordInput: FC<{
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}> = ({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder = '********',
  autoComplete,
  disabled,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="styled-form-group">
      <label className="form-input-label" htmlFor={id}>
        <span>* </span>
        {label}
      </label>
      <div className="password-input-wrapper">
        <input
          name={name}
          id={id}
          className={`form-input-field ${error ? 'input-error-content' : ''}`}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          className="password-toggle-button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      {error && <div className="form-input-error">{error}</div>}
    </div>
  );
};
