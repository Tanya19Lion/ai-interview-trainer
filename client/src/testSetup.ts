import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import i18n from './i18n';

// jsdom's navigator.language is "en-US", so language detection would start every test in English;
// the existing suites assert Ukrainian text.
beforeEach(async () => {
	localStorage.clear();
	await i18n.changeLanguage('uk');
});
