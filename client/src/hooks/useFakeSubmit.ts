import { useState } from 'react';

const FAKE_DELAY_MS = 700;

/** Simulates an async submit with no real backend call — used by the mock reset-password flows. */
export function useFakeSubmit() {
	const [pending, setPending] = useState(false);

	function run(onDone: () => void) {
		setPending(true);
		setTimeout(() => {
			setPending(false);
			onDone();
		}, FAKE_DELAY_MS);
	}

	return { pending, run };
}
