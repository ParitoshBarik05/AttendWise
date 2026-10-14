import mongoose from 'mongoose';
const slotSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }, weekday: { type: Number, required: true, min: 0, max: 6 }, startTime: { type: String, required: true }, endTime: { type: String, required: true }, room: { type: String, default: '' }, active: { type: Boolean, default: true } }, { timestamps: true });
export default mongoose.model('TimetableSlot', slotSchema);
