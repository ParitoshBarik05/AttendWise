import cron from 'node-cron';
import webpush from 'web-push';
import { DateTime } from 'luxon';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import TimetableSlot from '../models/TimetableSlot.js';
import ClassSession from '../models/ClassSession.js';
import PushSubscription from '../models/PushSubscription.js';
import NotificationDelivery from '../models/NotificationDelivery.js';

function configurePush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return true;
}
function localClock(user, now = new Date()) {
  let dt = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(user.timezone || 'Asia/Kolkata').plus({ minutes: 15 }).startOf('minute');
  if (!dt.isValid) dt = DateTime.fromJSDate(now).setZone('Asia/Kolkata').plus({ minutes: 15 }).startOf('minute');
  return { date: dt.toFormat('yyyy-MM-dd'), weekday: dt.weekday % 7, time: dt.toFormat('HH:mm') };
}
async function sendOnce({ user, subscription, subjectName, date, startTime, endTime, room, key }) {
  let reservation;
  try {
    reservation = await NotificationDelivery.create({ deliveryKey: key, user: user._id, subjectName, date, startTime, status: 'sent', sentAt: new Date() });
  } catch (err) {
    if (err?.code === 11000) return;
    throw err;
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title: 'Class starts in 15 minutes', body: `${subjectName} · ${startTime}–${endTime}${room ? ` · Room ${room}` : ''}`, url: '/?page=Attendance', tag: key, date, startTime, endTime, room }));
  } catch (err) {
    await NotificationDelivery.updateOne({ _id: reservation._id }, { status: 'failed', errorCode: String(err.statusCode || err.code || 'push_failed').slice(0, 80) });
    if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ user: user._id });
    throw err;
  }
}
export async function runReminderSweep(now = new Date()) {
  if (!configurePush()) return { skipped: true, reason: 'VAPID keys are not configured' };
  const subscriptions = await PushSubscription.find({ enabled: true }).lean();
  let checked = 0, sent = 0;
  for (const row of subscriptions) {
    const user = await User.findOne({ _id: row.user, remindersEnabled: { $ne: false } }).lean();
    if (!user) continue;
    const { date, weekday, time } = localClock(user, now);
    const slots = await TimetableSlot.find({ user: user._id, weekday, active: true, startTime: time }).populate('subject', 'name').lean();
    for (const slot of slots) {
      checked++;
      const existing = await ClassSession.findOne({ user: user._id, date, slot: slot._id }).lean();
      if (existing?.status === 'cancelled') continue;
      const subjectName = slot.subject?.name || 'Scheduled class';
      try { await sendOnce({ user, subscription: row.subscription, subjectName, date, startTime: slot.startTime, endTime: slot.endTime, room: slot.room, key: `${user._id}:${date}:slot:${slot._id}:device:${row._id}` }); sent++; }
      catch (err) { console.error('Push delivery failed:', err.statusCode || err.code || 'unknown'); }
    }
    const extras = await ClassSession.find({ user: user._id, date, startTime: time, source: 'extra', status: { $nin: ['cancelled', 'present', 'absent'] } }).populate('subject', 'name').lean();
    for (const item of extras) {
      checked++;
      try { await sendOnce({ user, subscription: row.subscription, subjectName: item.subject?.name || 'Extra class', date, startTime: item.startTime, endTime: item.endTime, room: item.room, key: `${user._id}:${date}:extra:${item._id}:device:${row._id}` }); sent++; }
      catch (err) { console.error('Push delivery failed:', err.statusCode || err.code || 'unknown'); }
    }
  }
  return { checked, sent };
}
export function startReminderScheduler() {
  if (!configurePush()) { console.warn('Push reminders disabled: configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.'); return null; }
  const task = cron.schedule('* * * * *', () => runReminderSweep().catch(err => console.error('Reminder sweep failed:', err.message)));
  console.log('Reminder scheduler started; checks for classes starting in 15 minutes every minute.');
  return task;
}
