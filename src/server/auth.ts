import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getDb } from './db.ts';
import type { UserRole } from '../types.ts';

const SECRET =
  process.env.KAAMSETU_SESSION_SECRET ||
  crypto.createHash('sha256').update('kaamsetu-local-dev-secret-2026').digest('hex');

export const SESSION_COOKIE_NAME = 'kaamsetu_session';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.userId || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface DocTokenPayload {
  docKind: 'identity' | 'academic' | 'employer';
  docId: string;
  viewerId: string;
  exp: number;
}

export function signDocAccessToken(payload: Omit<DocTokenPayload, 'exp'>): string {
  const full: DocTokenPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 5, // 5-minute short-lived signed URL
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyDocAccessToken(token: string): DocTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as DocTokenPayload;
    if (!parsed.docId || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export interface AuthedRequest extends Request {
  authUser?: {
    id: string;
    role: UserRole;
    email: string;
    fullName: string;
    accountStatus: string;
  };
}

function resolveUserFromRequest(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  let token = cookies[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, role, email, full_name, account_status FROM users WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(payload.userId) as
    | { id: string; role: UserRole; email: string; full_name: string; account_status: string }
    | undefined;
  if (!row || row.account_status === 'suspended') return null;

  return {
    id: row.id,
    role: row.role,
    email: row.email,
    fullName: row.full_name,
    accountStatus: row.account_status,
  };
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  req.authUser = resolveUserFromRequest(req) ?? undefined;
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.authUser = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient permissions for this resource' });
      return;
    }
    next();
  };
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(keyPrefix: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'local';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const current = rateBuckets.get(key);
    if (!current || current.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (current.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    current.count += 1;
    next();
  };
}
