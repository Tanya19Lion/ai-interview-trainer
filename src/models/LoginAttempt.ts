import { Schema, model, type InferSchemaType } from 'mongoose';

export const LOGIN_ATTEMPT_WINDOW_SECONDS = 900;

const loginAttemptSchema = new Schema({
	email: { type: String, required: true, unique: true },
	windowStart: { type: Date, required: true, default: Date.now },
	count: { type: Number, required: true },
});

loginAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: LOGIN_ATTEMPT_WINDOW_SECONDS });

export type LoginAttempt = InferSchemaType<typeof loginAttemptSchema>;
export const LoginAttemptModel = model('LoginAttempt', loginAttemptSchema);
