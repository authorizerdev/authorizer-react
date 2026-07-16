import { FC, useState } from 'react';
import { StyledButton, StyledFlex, StyledSeparator } from '../styledComponents';
import { ButtonAppearance, Views } from '../constants';
import { IconCheck, IconCopy, IconDownload, IconPrint } from '../icons/mfa';
import { copyToClipboard } from '../utils/common';
import { hasWindow } from '../utils/window';
import { AuthorizerVerifyOtp } from './AuthorizerVerifyOtp';

const downloadRecoveryCodes = (codes: string[]) => {
  if (!hasWindow()) {
    return;
  }
  const body = [
    'Authorizer account recovery codes',
    'Keep these somewhere safe. Each code can be used once.',
    '',
    ...codes,
    '',
  ].join('\n');
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'authorizer-recovery-codes.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const printRecoveryCodes = (codes: string[]) => {
  if (!hasWindow()) {
    return;
  }
  const win = window.open('', '_blank', 'width=480,height=640');
  if (!win) {
    return;
  }
  const items = codes.map((c) => `<li>${c}</li>`).join('');
  win.document.write(
    `<html><head><title>Authorizer recovery codes</title>` +
      `<style>body{font-family:monospace;padding:24px}` +
      `h1{font-size:16px}ol{line-height:1.8;font-size:14px}</style></head>` +
      `<body><h1>Authorizer recovery codes</h1>` +
      `<p>Keep these somewhere safe. Each code can be used once.</p>` +
      `<ol>${items}</ol></body></html>`
  );
  win.document.close();
  win.focus();
  win.print();
};

export const AuthorizerTOTPScanner: FC<{
  setView?: (v: Views) => void;
  onLogin?: (data: any) => void;
  email?: string;
  phone_number?: string;
  urlProps?: Record<string, any>;
  authenticator_scanner_image: string;
  authenticator_secret: string;
  authenticator_recovery_codes: string[];
}> = ({
  setView,
  onLogin,
  email,
  phone_number,
  authenticator_scanner_image,
  authenticator_secret,
  authenticator_recovery_codes,
  urlProps,
}) => {
  const [isOTPScreenVisisble, setIsOTPScreenVisisble] =
    useState<boolean>(false);
  // Tracks which control was just used so we can show a transient "Copied"
  // confirmation. The secret itself is never logged.
  const [copied, setCopied] = useState<'' | 'secret' | 'codes'>('');

  const handleContinue = () => {
    setIsOTPScreenVisisble(true);
  };

  const handleCopy = async (value: string, key: 'secret' | 'codes') => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(key);
      if (hasWindow()) {
        window.setTimeout(() => setCopied(''), 2000);
      }
    }
  };

  const recoveryCodes = authenticator_recovery_codes || [];
  const hasRecoveryCodes = recoveryCodes.length > 0;

  if (isOTPScreenVisisble) {
    return (
      <AuthorizerVerifyOtp
        {...{
          setView,
          onLogin,
          email,
          phone_number,
          urlProps,
        }}
        is_totp
        hasCodeFactor
      />
    );
  }

  return (
    <>
      <p style={{ margin: '10px 0px', fontWeight: 'bold' }}>
        Set up your authenticator app
      </p>
      <ol className="mfa-steps">
        <li>
          Open your authenticator app (Google Authenticator, Authy,
          1Password&hellip;).
        </li>
        <li>Scan the QR code below, or enter the setup key manually.</li>
        <li>Enter the 6-digit code the app generates to finish.</li>
      </ol>

      <div className="mfa-qr">
        <img
          src={`data:image/jpeg;base64,${authenticator_scanner_image}`}
          alt="QR code for setting up your authenticator app"
        />
      </div>

      <p style={{ margin: '12px 0px 4px' }}>
        Can&apos;t scan it? Enter this setup key manually:
      </p>
      <div className="mfa-secret-row">
        <code className="mfa-secret-value" aria-label="Authenticator setup key">
          {authenticator_secret}
        </code>
        <button
          type="button"
          className="mfa-icon-button"
          onClick={() => handleCopy(authenticator_secret, 'secret')}
          aria-label="Copy setup key"
        >
          {copied === 'secret' ? <IconCheck /> : <IconCopy />}
          {copied === 'secret' ? 'Copied' : 'Copy'}
        </button>
      </div>

      {hasRecoveryCodes && (
        <>
          <StyledSeparator />
          <p style={{ margin: '10px 0px', fontWeight: 'bold' }}>
            Save your recovery codes
          </p>
          <div className="mfa-warning" role="alert">
            <span aria-hidden="true">&#9888;</span>
            <span>
              Save these codes now. If you lose your authenticator device, they
              are the only way back into your account. Each code works once, and
              they won&apos;t be shown again.
            </span>
          </div>
          <ul
            className="mfa-recovery-grid"
            aria-label="Account recovery codes"
            style={{ listStyle: 'none' }}
          >
            {recoveryCodes.map((code) => (
              <li key={code} className="mfa-recovery-code">
                {code}
              </li>
            ))}
          </ul>
          <div className="mfa-recovery-actions">
            <button
              type="button"
              className="mfa-icon-button"
              onClick={() => handleCopy(recoveryCodes.join('\n'), 'codes')}
              aria-label="Copy all recovery codes"
            >
              {copied === 'codes' ? <IconCheck /> : <IconCopy />}
              {copied === 'codes' ? 'Copied' : 'Copy all'}
            </button>
            <button
              type="button"
              className="mfa-icon-button"
              onClick={() => downloadRecoveryCodes(recoveryCodes)}
              aria-label="Download recovery codes as a text file"
            >
              <IconDownload />
              Download
            </button>
            <button
              type="button"
              className="mfa-icon-button"
              onClick={() => printRecoveryCodes(recoveryCodes)}
              aria-label="Print recovery codes"
            >
              <IconPrint />
              Print
            </button>
          </div>
          <p className="mfa-status" role="status" aria-live="polite">
            {copied === 'codes' ? 'Recovery codes copied to clipboard.' : ''}
            {copied === 'secret' ? 'Setup key copied to clipboard.' : ''}
          </p>
        </>
      )}

      <StyledFlex justifyContent="center">
        <StyledButton
          type="button"
          appearance={ButtonAppearance.Primary}
          onClick={handleContinue}
        >
          Continue
        </StyledButton>
      </StyledFlex>
    </>
  );
};
