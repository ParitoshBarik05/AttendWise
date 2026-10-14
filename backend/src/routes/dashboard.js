import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Subject from '../models/Subject.js';
import ClassSession from '../models/ClassSession.js';
import { summarize } from '../utils/attendance.js';
const router=Router();router.use(requireAuth);
router.get('/',async(req,res)=>{const subjects=await Subject.find({user:req.userId}).sort({name:1});const result=[];for(const subject of subjects){const sessions=await ClassSession.find({user:req.userId,subject:subject._id});const stats=summarize(sessions,subject.target);result.push({subject,stats});}const all=result.reduce((a,x)=>({present:a.present+x.stats.present,absent:a.absent+x.stats.absent}),{present:0,absent:0});const total=all.present+all.absent;res.json({subjects:result,overall:{...all,total,percentage:total?Number((all.present/total*100).toFixed(1)):0}});});
export default router;
