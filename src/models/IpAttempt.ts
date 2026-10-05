import { Schema, model, type InferSchemaType } from 'mongoose';

export const IP_ATTEMPT_WINDOW_SECONDS = 900;

const ipAttemptSchema = new Schema({
	// "<scope>:<ip>", e.g. "register:203.0.113.7" — one document per scope and address.
	key: { type: String, required: true, unique: true },
	windowStart: { type: Date, required: true, default: Date.now },
	count: { type: Number, required: true },
});

ipAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: IP_ATTEMPT_WINDOW_SECONDS });

export type IpAttempt = InferSchemaType<typeof ipAttemptSchema>;
export const IpAttemptModel = model('IpAttempt', ipAttemptSchema);
