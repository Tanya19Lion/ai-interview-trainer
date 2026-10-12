const { Schema, model } = require('mongoose');

const interviewSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
});

module.exports = model('InterviewSession', interviewSessionSchema);
