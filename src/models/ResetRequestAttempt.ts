import { Schema, model, type InferSchemaType } from 'mongoose';

export const RESET_REQUEST_WINDOW_SECONDS = 3600;

const resetRequestAttemptSchema = new Schema({
	// Lower-cased email, whether or not an account exists for it (AC-02: the counter must not
	// depend on the account existing).
	email: { type: String, required: true, unique: true },
	windowStart: { type: Date, required: true, default: Date.now },
	count: { type: Number, required: true },
});

resetRequestAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: RESET_REQUEST_WINDOW_SECONDS });

export type ResetRequestAttempt = InferSchemaType<typeof resetRequestAttemptSchema>;
export const ResetRequestAttemptModel = model('ResetRequestAttempt', resetRequestAttemptSchema);
