export const RESET_PASSWORD_PATH = '/auth/reset-password';

function readParamFromUrl(param: string, url: URL) {
  const searchValue = url.searchParams.get(param);

  if (searchValue) {
    return searchValue;
  }

  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  return hashParams.get(param);
}

export function getAuthRedirectMode(href: string) {
  const url = new URL(href);
  const type = readParamFromUrl('type', url);
  const accessToken = readParamFromUrl('access_token', url);
  const tokenHash = readParamFromUrl('token_hash', url);

  if (url.pathname === RESET_PASSWORD_PATH) {
    return 'reset-password' as const;
  }

  if (type === 'recovery' && (accessToken || tokenHash)) {
    return 'reset-password' as const;
  }

  return null;
}

export function getAuthRedirectError(href: string) {
  const url = new URL(href);
  const description = readParamFromUrl('error_description', url);

  if (!description) {
    return null;
  }

  const normalizedDescription = description.replace(/\+/g, ' ').trim();

  if (/invalid or has expired/i.test(normalizedDescription)) {
    return 'Der Bestätigungs- oder Wiederherstellungslink ist ungültig oder bereits abgelaufen. Bitte fordere einen neuen Link an.';
  }

  return normalizedDescription;
}

export function getAuthRedirectMessage(href: string) {
  const url = new URL(href);
  const type = readParamFromUrl('type', url);
  const accessToken = readParamFromUrl('access_token', url);
  const tokenHash = readParamFromUrl('token_hash', url);
  const errorDescription = readParamFromUrl('error_description', url);

  if (errorDescription) {
    return null;
  }

  if (type === 'signup' && (accessToken || tokenHash)) {
    return 'E-Mail bestätigt. Du bist jetzt erfolgreich angemeldet.';
  }

  return null;
}

export function clearAuthRedirectState(href: string) {
  const url = new URL(href);
  const authSearchParams = [
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'type',
    'code',
    'error',
    'error_code',
    'error_description',
  ];

  for (const param of authSearchParams) {
    url.searchParams.delete(param);
  }

  if (url.pathname === RESET_PASSWORD_PATH) {
    url.pathname = '/';
  }

  url.hash = '';

  return `${url.pathname}${url.search}${url.hash}`;
}
