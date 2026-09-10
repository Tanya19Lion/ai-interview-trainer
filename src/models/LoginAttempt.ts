import { Schema, model, type InferSchemaType } from 'mongoose';

const loginAttemptSchema = new Schema({
	email: { type: String, required: true, unique: true },
	windowStart: { type: Date, required: true, default: Date.now },
	count: { type: Number, required: true },
});

loginAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: 900 });

export type LoginAttempt = InferSchemaType<typeof loginAttemptSchema>;
export const LoginAttemptModel = model('LoginAttempt', loginAttemptSchema);
