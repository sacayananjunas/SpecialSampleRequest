// Session handling: signed JWT (jose, HS256) in an httpOnly cookie.
import { SignJWT, jwtVerify } from 'jose';
import { query } from './db.js';
import { HttpError } from './http.js';

const COOKIE = 'ps_session';
const MAX_AGE = 7 * 24 * 3600;

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new HttpError(500, 'Server login is not configured (JWT_SECRET missing).', 'CONFIG');
  return new TextEncoder().encode(s);
}

const secureFlag = () => (process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '');
const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag()}`;

export function publicUser(u) {
  const initials = u.full_name.replace(/^Dr\.\s*/, '').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return { id: u.id, email: u.email, name: u.full_name, role: u.role, department: u.department, title: u.title, site: u.site, initials };
}

export async function startSession(res, user) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
  res.setHeader('Set-Cookie', cookie(token, MAX_AGE));
}

export function endSession(res) {
  res.setHeader('Set-Cookie', cookie('', 0));
}

function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** The logged-in user (fresh from the database), or null. */
export async function currentUser(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] }));
  } catch {
    return null;
  }
  const rows = await query('SELECT id, email, full_name, role, department, title, site FROM users WHERE id = $1', [Number(payload.sub)]);
  return rows[0] ? publicUser(rows[0]) : null;
}

/** Throws 401 when logged out, 403 when the role is not allowed. */
export async function requireUser(req, roles) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Please log in to continue.', 'UNAUTHENTICATED');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "Your role doesn't have access to this action.", 'FORBIDDEN');
  return user;
}

export const LAB_ROLES = ['analyst', 'supervisor'];
export const isLab = (user) => LAB_ROLES.includes(user.role);
