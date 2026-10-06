import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const passwordResetSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		tokenHash: { type: String, required: true, unique: true, maxlength: 64 },
		expiresAt: { type: Date, required: true },
		// Dead field, kept optional only until existing documents are gone; removal is phase 2 in
		// docs/data-model.md's Schema-change log.
		attemptsRemaining: { type: Number },
		createdAt: { type: Date, required: true, default: Date.now, immutable: true },
	},
	{ timestamps: false },
);

passwordResetSchema.index({ userId: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordReset = InferSchemaType<typeof passwordResetSchema> & {
	userId: Types.ObjectId;
};
export const PasswordResetModel = model('PasswordReset', passwordResetSchema);
