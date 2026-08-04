import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
	{
		googleId: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		avatarUrl: { type: String },
	},
	{ timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
