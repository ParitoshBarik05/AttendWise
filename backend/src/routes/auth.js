import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const schema = z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().email().max(200), password: z.string().min(8).max(100) });
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, isAdmin: Boolean(process.env.ADMIN_EMAIL && u.email.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()) });
router.post('/register', async (req, res, next) => { try {
  const data = schema.parse(req.body); if (!data.name) return res.status(400).json({ message: 'Name is required.' });
  if (await User.findOne({ email: data.email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({ name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12) });
  res.status(201).json({ user: publicUser(user), token: jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' }) });
} catch (e) { if (e.name === 'ZodError') return res.status(400).json({ message: e.issues[0].message }); next(e); } });
router.post('/login', async (req, res, next) => { try {
  const data = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
  res.json({ user: publicUser(user), token: jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' }) });
} catch (e) { if (e.name === 'ZodError') return res.status(400).json({ message: e.issues[0].message }); next(e); } });
router.get('/me', requireAuth, async (req, res) => { const user = await User.findById(req.userId); if (!user) return res.status(404).json({ message: 'User not found.' }); res.json({ user: publicUser(user) }); });
export default router;
