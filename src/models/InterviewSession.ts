import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const TOPICS = ['react', 'javascript', 'nodejs', 'typescript', 'nextjs', 'css', 'html', 'sql', 'restapi'] as const;
export const LEVELS = ['junior', 'middle', 'senior'] as const;

const questionAttemptSchema = new Schema(
	{
		question: { type: String, required: true },
		answer: { type: String, required: true },
		score: { type: Number, required: true, min: 0, max: 10 },
		feedback: { type: String, required: true },
		correctAnswer: { type: String, required: true },
		weakTopics: { type: [String], default: [] },
	},
	{ _id: false },
);

const interviewSessionSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		topic: { type: String, enum: TOPICS, required: true },
		level: { type: String, enum: LEVELS, required: true },
		questions: { type: [questionAttemptSchema], default: [] },
		averageScore: { type: Number },
		status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
		completedAt: { type: Date },
	},
	{ timestamps: true },
);

export type InterviewSession = InferSchemaType<typeof interviewSessionSchema> & {
	userId: Types.ObjectId;
};
export const InterviewSessionModel = model('InterviewSession', interviewSessionSchema);
