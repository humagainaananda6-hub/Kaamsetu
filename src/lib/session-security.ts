export interface CookieHeaderCheckInput {
  secure?: boolean;
  forwardedProto?: string | string[];
}

export function isHttpsRequest(input: CookieHeaderCheckInput): boolean {
  if (input.secure) return true;
  const proto = Array.isArray(input.forwardedProto)
    ? input.forwardedProto.join(',')
    : input.forwardedProto || '';
  return proto
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .includes('https');
}

export function buildSessionCookieHeader(
  name: string,
  value: string,
  options: { isHttps: boolean; maxAgeSeconds: number },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
  ];
  if (options.isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

export interface MutationOriginCheckInput {
  method: string;
  hasBearerAuth: boolean;
  hasSessionCookie: boolean;
  xRequestedWith?: string | string[];
  origin?: string | string[];
  host?: string | string[];
  forwardedHost?: string | string[];
}

function firstHeaderValue(val?: string | string[]): string {
  if (!val) return '';
  const raw = Array.isArray(val) ? val[0] : val;
  return raw.split(',')[0].trim();
}

export function isSafeCookieMutationRequest(input: MutationOriginCheckInput): boolean {
  const method = input.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }
  // Bearer tokens are sent explicitly in JS headers and are not auto-attached by browser CSRF.
  if (input.hasBearerAuth || !input.hasSessionCookie) {
    return true;
  }

  const xrw = firstHeaderValue(input.xRequestedWith);
  if (xrw.toLowerCase() === 'xmlhttprequest') {
    return true;
  }

  const origin = firstHeaderValue(input.origin);
  if (!origin) {
    return false;
  }

  let originHost = '';
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const expectedHost = (
    firstHeaderValue(input.forwardedHost) || firstHeaderValue(input.host)
  ).toLowerCase();

  return Boolean(expectedHost && originHost === expectedHost);
}
