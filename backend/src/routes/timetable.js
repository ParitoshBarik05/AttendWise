import { Router } from 'express';
import { z } from 'zod';
import TimetableSlot from '../models/TimetableSlot.js';
import Subject from '../models/Subject.js';
import { requireAuth } from '../middleware/auth.js';
const router=Router(); router.use(requireAuth);
const schema=z.object({subject:z.string(),weekday:z.coerce.number().int().min(0).max(6),startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),room:z.string().max(50).optional()});
router.get('/',async(req,res)=>res.json(await TimetableSlot.find({user:req.userId,active:true}).populate('subject','name code target').sort({weekday:1,startTime:1})));
router.post('/',async(req,res,next)=>{try{const d=schema.parse(req.body);if(d.startTime>=d.endTime)return res.status(400).json({message:'End time must be after start time.'});if(!await Subject.exists({_id:d.subject,user:req.userId}))return res.status(400).json({message:'Choose one of your own subjects.'});const conflict=await TimetableSlot.findOne({user:req.userId,weekday:d.weekday,active:true,startTime:{$lt:d.endTime},endTime:{$gt:d.startTime}});if(conflict)return res.status(409).json({message:'This time overlaps with another class on that weekday.'});const [sh, sm] = d.startTime.split(':').map(Number);
const [eh, em] = d.endTime.split(':').map(Number);
const duration = (eh * 60 + em) - (sh * 60 + sm);
if (duration === 120) {
  const midpoint = sh * 60 + sm + 60;
  const middle = `${String(Math.floor(midpoint / 60)).padStart(2, '0')}:${String(midpoint % 60).padStart(2, '0')}`;
  const created = await TimetableSlot.create([
    { ...d, endTime: middle, user: req.userId },
    { ...d, startTime: middle, user: req.userId }
  ]);
  return res.status(201).json(created);
}
res.status(201).json(await TimetableSlot.create({...d,user:req.userId}));}catch(e){if(e.name==='ZodError')return res.status(400).json({message:e.issues[0].message});next(e);}});
router.delete('/:id',async(req,res)=>{const item=await TimetableSlot.findOneAndDelete({_id:req.params.id,user:req.userId});if(!item)return res.status(404).json({message:'Timetable slot not found.'});res.json({message:'Timetable slot deleted. Previously recorded sessions remain in history.'});});
export default router;
