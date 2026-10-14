import mongoose from 'mongoose';
const subjectSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, name: { type: String, required: true, trim: true, maxlength: 100 }, code: { type: String, trim: true, default: '' }, faculty: { type: String, trim: true, default: '' }, target: { type: Number, min: 1, max: 100, default: 75 } }, { timestamps: true });
subjectSchema.index({ user: 1, name: 1 }, { unique: true });
export default mongoose.model('Subject', subjectSchema);
