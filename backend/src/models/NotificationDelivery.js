import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  deliveryKey: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectName: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  sentAt: { type: Date, default: Date.now },
  errorCode: { type: String, default: '' }
}, { timestamps: true });
export default mongoose.model('NotificationDelivery', schema);
