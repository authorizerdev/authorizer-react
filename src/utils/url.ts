import { hasWindow } from './window';

export const getSearchParams = (search = ''): Record<string, string> => {
  let searchPrams = search;
  if (!searchPrams && hasWindow()) {
    searchPrams = window.location.search;
  }
  const urlSearchParams = new URLSearchParams(search);
  // @ts-ignore
  const params = Object.fromEntries(urlSearchParams.entries());
  return params;
};
