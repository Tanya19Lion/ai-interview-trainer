import { Schema, model } from 'mongoose';

const TOPICS = ['javascript', 'system-design', 'behavioral'] as const;

const interviewSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, enum: TOPICS, required: true },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
});

export const InterviewSessionModel = model('InterviewSession', interviewSessionSchema);
