import { hasWindow } from './window';

export const getIntervalDiff = (accessTokenExpiresAt: number): number => {
  const expiresAt = accessTokenExpiresAt * 1000 - 300000;
  const currentDate = new Date();

  const millisecond = new Date(expiresAt).getTime() - currentDate.getTime();
  return millisecond;
};

export const getCrypto = () => {
  //ie 11.x uses msCrypto
  return hasWindow()
    ? ((window.crypto || (window as any).msCrypto) as Crypto)
    : null;
};

export const createRandomString = () => {
  const charset =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_~.';
  let random = '';
  const crypto = getCrypto();
  if (crypto) {
    const randomValues = Array.from(crypto.getRandomValues(new Uint8Array(43)));
    randomValues.forEach((v) => (random += charset[v % charset.length]));
  }
  return random;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  // Legacy fallback for non-secure contexts / older browsers.
  if (!hasWindow()) {
    return false;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  return ok;
};

export const createQueryParams = (params: any) => {
  return Object.keys(params)
    .filter((k) => typeof params[k] !== 'undefined')
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
};
