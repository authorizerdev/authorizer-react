export const getIntervalDiff = (accessTokenExpiresAt: number): number => {
  const expiresAt = accessTokenExpiresAt * 1000 - 300000;
  const currentDate = new Date();

  const millisecond = new Date(expiresAt).getTime() - currentDate.getTime();
  return millisecond;
};
