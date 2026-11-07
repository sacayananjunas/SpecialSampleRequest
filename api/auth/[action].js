// /api/auth/signup · /api/auth/login · /api/auth/logout · /api/auth/me
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../lib/db.js';
import { route, body, HttpError, notFound } from '../../lib/http.js';
import { startSession, endSession, currentUser, publicUser } from '../../lib/auth.js';
import { parse } from '../../lib/validation.js';
import { DEPARTMENTS, SITES } from '../../shared/rules.js';

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(100)
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/\d/, 'Include at least one number'),
  department: z.string().refine((v) => DEPARTMENTS.includes(v), 'Choose your department'),
  site: z.string().refine((v) => SITES.includes(v), 'Choose your site'),
  role: z.enum(['requester', 'analyst', 'supervisor'], { errorMap: () => ({ message: 'Choose a role' }) }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const TITLES = { requester: 'Requester', analyst: 'Lab Analyst', supervisor: 'Laboratory Supervisor' };

async function signup(req, res) {
  const d = parse(signupSchema, body(req));
  const exists = await query('SELECT 1 FROM users WHERE email = $1', [d.email]);
  if (exists.length) throw new HttpError(409, 'An account with this email already exists. Try logging in instead.', 'EMAIL_TAKEN');
  const hash = await bcrypt.hash(d.password, 10);
  const [u] = await query(
    'INSERT INTO users (email, password_hash, full_name, role, department, title, site) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, full_name, role, department, title, site',
    [d.email, hash, d.name, d.role, d.department, TITLES[d.role], d.site],
  );
  await startSession(res, u);
  res.status(201).json({ user: publicUser(u) });
}

async function login(req, res) {
  const d = parse(loginSchema, body(req));
  const [u] = await query('SELECT id, email, password_hash, full_name, role, department, title, site FROM users WHERE email = $1', [d.email]);
  // Same message for unknown email and wrong password, so accounts can't be probed
  if (!u || !(await bcrypt.compare(d.password, u.password_hash))) throw new HttpError(401, 'That email and password combination is not right.', 'BAD_CREDENTIALS');
  await startSession(res, u);
  res.json({ user: publicUser(u) });
}

const POST = { signup, login, logout: async (req, res) => (endSession(res), res.json({ ok: true })) };

export default route({
  POST: (req, res) => {
    const fn = POST[req.query.action];
    if (!fn) throw notFound();
    return fn(req, res);
  },
  GET: async (req, res) => {
    if (req.query.action !== 'me') throw notFound();
    res.json({ user: await currentUser(req) });
  },
});
