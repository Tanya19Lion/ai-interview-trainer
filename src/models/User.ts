import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
	{
		googleId: { type: String, unique: true, sparse: true },
		passwordHash: { type: String },
		email: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		avatarUrl: { type: String },
	},
	{ timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
