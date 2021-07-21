export const getSearchParams = (
  search = window.location.search
): Record<string, string> => {
  const urlSearchParams = new URLSearchParams(search);
  // @ts-ignore
  const params = Object.fromEntries(urlSearchParams.entries());
  return params;
};
