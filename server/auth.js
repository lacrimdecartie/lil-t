import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

export function signToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function ensureAdminUser(username, password) {
  const row = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!row) {
    const hash = await argon2.hash(password);
    const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    return info.lastInsertRowid;
  }
  return row.id;
}

export async function verifyUser(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return null;
  const ok = await argon2.verify(user.password_hash, password);
  return ok ? user : null;
}
