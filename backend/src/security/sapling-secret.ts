import { SAPLING_SECRET } from '../constants/project.constants';

export const SAPLING_SECRET_MISSING_MESSAGE =
  'SAPLING_SECRET must be configured before starting the server.';

export function getSaplingSecretOrThrow(
  secret: string | null = SAPLING_SECRET,
): string {
  const normalizedSecret = secret?.trim();

  if (
    !normalizedSecret ||
    normalizedSecret.toLowerCase() === 'null' ||
    normalizedSecret.toLowerCase() === 'undefined'
  ) {
    throw new Error(SAPLING_SECRET_MISSING_MESSAGE);
  }

  return normalizedSecret;
}
