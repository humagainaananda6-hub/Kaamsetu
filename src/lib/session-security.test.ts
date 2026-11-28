import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSessionCookieHeader,
  isHttpsRequest,
  isSafeCookieMutationRequest,
} from './session-security';

test('isHttpsRequest detects TLS directly or via x-forwarded-proto', () => {
  assert.equal(isHttpsRequest({ secure: true }), true);
  assert.equal(isHttpsRequest({ secure: false, forwardedProto: 'https' }), true);
  assert.equal(isHttpsRequest({ secure: false, forwardedProto: 'https, http' }), true);
  assert.equal(isHttpsRequest({ secure: false, forwardedProto: 'http' }), false);
  assert.equal(isHttpsRequest({}), false);
});

test('buildSessionCookieHeader emits Partitioned SameSite=None on HTTPS and SameSite=Lax on HTTP', () => {
  const httpsCookie = buildSessionCookieHeader('kaamsetu_session', 'abc.123', {
    isHttps: true,
    maxAgeSeconds: 604800,
  });
  assert.match(httpsCookie, /HttpOnly/);
  assert.match(httpsCookie, /Secure/);
  assert.match(httpsCookie, /SameSite=None/);
  assert.match(httpsCookie, /Partitioned/);
  assert.match(httpsCookie, /Max-Age=604800/);

  const httpCookie = buildSessionCookieHeader('kaamsetu_session', 'abc.123', {
    isHttps: false,
    maxAgeSeconds: 604800,
  });
  assert.match(httpCookie, /HttpOnly/);
  assert.match(httpCookie, /SameSite=Lax/);
  assert.doesNotMatch(httpCookie, /SameSite=None/);
  assert.doesNotMatch(httpCookie, /Partitioned/);
});

test('isSafeCookieMutationRequest enforces Origin or X-Requested-With on cookie mutations', () => {
  assert.equal(
    isSafeCookieMutationRequest({
      method: 'GET',
      hasBearerAuth: false,
      hasSessionCookie: true,
    }),
    true,
  );
  assert.equal(
    isSafeCookieMutationRequest({
      method: 'POST',
      hasBearerAuth: true,
      hasSessionCookie: true,
    }),
    true,
  );
  assert.equal(
    isSafeCookieMutationRequest({
      method: 'POST',
      hasBearerAuth: false,
      hasSessionCookie: true,
      xRequestedWith: 'XMLHttpRequest',
    }),
    true,
  );
  assert.equal(
    isSafeCookieMutationRequest({
      method: 'POST',
      hasBearerAuth: false,
      hasSessionCookie: true,
      origin: 'https://ais-dev-example.run.app',
      forwardedHost: 'ais-dev-example.run.app',
    }),
    true,
  );
  assert.equal(
    isSafeCookieMutationRequest({
      method: 'POST',
      hasBearerAuth: false,
      hasSessionCookie: true,
      origin: 'https://evil.example.com',
      host: 'ais-dev-example.run.app',
    }),
    false,
  );
});
