import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import ClassSession from '../models/ClassSession.js';

const router = Router();
const configuredAdminEmail = () => (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const safeEqual = (provided, expected) => {
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

// First factor: the signed-in account must be the configured administrator account.
router.post('/unlock', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }), requireAuth, async (req, res, next) => {
  try {
    const email = configuredAdminEmail();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    if (!email || !adminPassword) {
      return res.status(503).json({ message: 'Admin access is not fully configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in the root .env file, then restart the app.' });
    }
    const user = await User.findById(req.userId).select('email');
    if (!user || user.email.toLowerCase() !== email) {
      return res.status(403).json({ message: 'Administrator account only.' });
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!safeEqual(password, adminPassword)) {
      return res.status(401).json({ message: 'Incorrect administrator password.' });
    }
    const adminToken = jwt.sign({ sub: String(user._id), adminAccess: true }, process.env.JWT_SECRET, { expiresIn: '20m' });
    return res.json({ adminToken, expiresIn: 1200 });
  } catch (error) { next(error); }
});

// Second factor: the short-lived admin token is required for every private data request.
router.use(async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Unlock the admin portal first.' });
    let claims;
    try { claims = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ message: 'Admin session expired. Unlock the portal again.' }); }
    if (claims.adminAccess !== true || !claims.sub) return res.status(403).json({ message: 'A separate admin unlock is required.' });
    const email = configuredAdminEmail();
    if (!email) return res.status(503).json({ message: 'Admin access is not configured.' });
    const user = await User.findById(claims.sub).select('email');
    if (!user || user.email.toLowerCase() !== email) return res.status(403).json({ message: 'Administrator access only.' });
    next();
  } catch (error) { next(error); }
});

router.get('/overview', async (_req, res, next) => {
  try {
    const users = await User.find({}).select('name email createdAt').sort({ createdAt: -1 }).lean();
    const userIds = users.map(user => user._id);
    const [subjects, sessions] = await Promise.all([
      Subject.find({ user: { $in: userIds } }).select('user name code faculty target').sort({ name: 1 }).lean(),
      ClassSession.find({ user: { $in: userIds } }).populate('subject', 'name code').sort({ date: -1, startTime: 1 }).lean()
    ]);
    const subjectMap = new Map();
    for (const subject of subjects) {
      const key = String(subject.user);
      if (!subjectMap.has(key)) subjectMap.set(key, []);
      subjectMap.get(key).push(subject);
    }
    const sessionMap = new Map();
    for (const session of sessions) {
      const key = String(session.user);
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key).push(session);
    }
    res.json({
      totals: { users: users.length, subjects: subjects.length, sessions: sessions.length },
      users: users.map(user => ({
        id: String(user._id), name: user.name, email: user.email, createdAt: user.createdAt,
        subjects: (subjectMap.get(String(user._id)) || []).map(subject => ({
          id: String(subject._id), name: subject.name, code: subject.code, faculty: subject.faculty, target: subject.target
        })),
        attendance: (sessionMap.get(String(user._id)) || []).map(session => ({
          id: String(session._id), date: session.date, startTime: session.startTime, endTime: session.endTime,
          subject: session.subject?.name || 'Deleted subject', status: session.status, source: session.source
        }))
      }))
    });
  } catch (error) { next(error); }
});
export default router;
