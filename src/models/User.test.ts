import { describe, expect, it } from 'vitest';
import { UserModel } from './User.js';

// T1 Scope: `tokenVersion: { type: Number, required: true, default: 0 }` on `src/models/User.ts`,
// matching docs/features/forgot-password/data-model.md's User entity table exactly.
// T1 DoD: field matches data-model.md's table for type/required/default.
describe('User.tokenVersion field (T1)', () => {
	it('is a Number path on the schema', () => {
		const path = UserModel.schema.path('tokenVersion');

		expect(path).toBeDefined();
		expect(path.instance).toBe('Number');
	});

	it('is required', () => {
		const path = UserModel.schema.path('tokenVersion');

		expect(path.isRequired).toBe(true);
	});

	it('defaults to 0 for a newly constructed document', () => {
		const doc = new UserModel({ email: 'jobseeker@example.test', name: 'Test User' });

		expect(doc.tokenVersion).toBe(0);
	});

	it('defaults to 0 (not undefined/null) on validation of a new document', () => {
		const doc = new UserModel({ email: 'jobseeker@example.test', name: 'Test User' });
		const err = doc.validateSync();

		expect(err).toBeUndefined();
		expect(doc.tokenVersion).toBe(0);
	});

	// data-model.md's Schema-change log: "Mongoose applies the schema default to every document
	// read back, including ones written before this field existed; no existing User document
	// needs to be rewritten for the default to take effect." — simulate a pre-existing document
	// (written before tokenVersion existed) being read back under the updated schema via hydrate.
	it('defaults to 0 for a pre-existing document hydrated without a stored tokenVersion', () => {
		const doc = UserModel.hydrate({
			_id: '507f1f77bcf86cd799439011',
			email: 'legacy@example.test',
			name: 'Legacy User',
		});

		expect(doc.tokenVersion).toBe(0);
	});
});
