import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import webpush from 'web-push';
import { requireAuth } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import NotificationDelivery from '../models/NotificationDelivery.js';
const router = Router();
router.use(requireAuth);
const configured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
router.get('/public-key', (_req, res) => {
  if (!configured()) return res.status(503).json({ message: 'Push notifications are not configured yet. See SETUP.md.' });
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});
router.post('/subscribe', async (req, res, next) => {
  try {
    if (!configured()) return res.status(503).json({ message: 'Push notifications are not configured yet. See SETUP.md.' });
    const parsed = z.object({ endpoint: z.string().url().max(2048), keys: z.object({ p256dh: z.string().min(10).max(512), auth: z.string().min(5).max(512) }) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid push subscription.' });
    const endpointHash = createHash('sha256').update(parsed.data.endpoint).digest('hex');
    await PushSubscription.findOneAndUpdate({ endpointHash }, { user: req.userId, endpointHash, subscription: parsed.data, enabled: true, updatedAt: new Date() }, { upsert: true, new: true, runValidators: true });
    res.status(201).json({ enabled: true, message: 'Class reminders enabled on this device.' });
  } catch (e) { next(e); }
});
router.delete('/subscribe', async (req, res, next) => {
  try { await PushSubscription.deleteOne({ user: req.userId }); res.json({ enabled: false, message: 'Push subscription removed for this account.' }); }
  catch (e) { next(e); }
});
router.get('/history', async (req, res, next) => {
  try { const rows = await NotificationDelivery.find({ user: req.userId }).sort({ createdAt: -1 }).limit(100).select('subjectName date startTime status sentAt errorCode'); res.json(rows); }
  catch (e) { next(e); }
});
export default router;
