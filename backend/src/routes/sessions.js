import { Router } from 'express';
import { z } from 'zod';
import ClassSession from '../models/ClassSession.js';
import TimetableSlot from '../models/TimetableSlot.js';
import Subject from '../models/Subject.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router();router.use(requireAuth);
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
router.get('/',async(req,res,next)=>{try{const date=dateSchema.parse(req.query.date);const [y,m,d]=date.split('-').map(Number);const weekday=new Date(y,m-1,d).getDay();const slots=await TimetableSlot.find({user:req.userId,weekday,active:true});for(const slot of slots){await ClassSession.updateOne({user:req.userId,date,slot:slot._id},{$setOnInsert:{user:req.userId,subject:slot.subject,date,startTime:slot.startTime,endTime:slot.endTime,room:slot.room,status:'scheduled',source:'timetable',slot:slot._id}},{upsert:true});}const sessions=await ClassSession.find({user:req.userId,date}).populate('subject','name code target').sort({startTime:1});res.json(sessions);}catch(e){if(e.name==='ZodError')return res.status(400).json({message:'Use date=YYYY-MM-DD.'});next(e);}});
router.post('/extra',async(req,res,next)=>{try{const d=z.object({subject:z.string(),date:dateSchema,startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),room:z.string().max(50).optional(),note:z.string().max(300).optional()}).parse(req.body);if(d.startTime>=d.endTime)return res.status(400).json({message:'End time must be after start time.'});if(!await Subject.exists({_id:d.subject,user:req.userId}))return res.status(400).json({message:'Choose one of your own subjects.'});const conflict=await ClassSession.findOne({user:req.userId,date:d.date,status:{$ne:'cancelled'},startTime:{$lt:d.endTime},endTime:{$gt:d.startTime}});if(conflict)return res.status(409).json({message:'This class overlaps with another scheduled class on that date.'});const weekday=new Date(`${d.date}T12:00:00`).getDay();const slotConflict=await TimetableSlot.findOne({user:req.userId,weekday,active:true,startTime:{$lt:d.endTime},endTime:{$gt:d.startTime}});if(slotConflict)return res.status(409).json({message:'This class overlaps with a recurring timetable slot.'});const [sh, sm] = d.startTime.split(':').map(Number);
const [eh, em] = d.endTime.split(':').map(Number);
const duration = (eh * 60 + em) - (sh * 60 + sm);
if (duration === 120) {
  const midpoint = sh * 60 + sm + 60;
  const middle = `${String(Math.floor(midpoint / 60)).padStart(2, '0')}:${String(midpoint % 60).padStart(2, '0')}`;
  const created = await ClassSession.create([
    { ...d, startTime: d.startTime, endTime: middle, user: req.userId, status: 'scheduled', source: 'extra' },
    { ...d, startTime: middle, endTime: d.endTime, user: req.userId, status: 'scheduled', source: 'extra' }
  ]);
  return res.status(201).json(created);
}
res.status(201).json(await ClassSession.create({...d,user:req.userId,status:'scheduled',source:'extra'}));}catch(e){if(e.name==='ZodError')return res.status(400).json({message:e.issues[0].message});next(e);}});
router.patch('/:id/status',async(req,res)=>{const status=z.enum(['scheduled','present','absent','cancelled']).safeParse(req.body.status);if(!status.success)return res.status(400).json({message:'Status must be present, absent, cancelled, or scheduled.'});const item=await ClassSession.findOneAndUpdate({_id:req.params.id,user:req.userId},{status:status.data},{new:true}).populate('subject','name code target');if(!item)return res.status(404).json({message:'Class session not found.'});res.json(item);});
router.get('/history',async(req,res)=>{const from=req.query.from||'2000-01-01',to=req.query.to||'2099-12-31';if(!dateSchema.safeParse(from).success||!dateSchema.safeParse(to).success)return res.status(400).json({message:'Dates must use YYYY-MM-DD.'});const sessions=await ClassSession.find({user:req.userId,date:{$gte:from,$lte:to}}).populate('subject','name code target').sort({date:-1,startTime:1}).limit(1000);res.json(sessions);});
export default router;
