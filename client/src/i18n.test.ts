import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { LANG_STORAGE_KEY, currentLang, detectInitialLang, setLanguage } from './i18n';

describe('detectInitialLang', () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('prefers a stored choice over the browser language', () => {
		localStorage.setItem(LANG_STORAGE_KEY, 'en');
		vi.stubGlobal('navigator', { language: 'uk-UA' });

		expect(detectInitialLang()).toBe('en');
	});

	it('ignores a corrupt stored value and uses the browser language', () => {
		localStorage.setItem(LANG_STORAGE_KEY, 'fr');
		vi.stubGlobal('navigator', { language: 'uk-UA' });

		expect(detectInitialLang()).toBe('uk');
	});

	it('maps uk-* browser languages to uk and everything else to en', () => {
		vi.stubGlobal('navigator', { language: 'uk' });
		expect(detectInitialLang()).toBe('uk');

		vi.stubGlobal('navigator', { language: 'de-DE' });
		expect(detectInitialLang()).toBe('en');
	});

	it('falls back to uk when navigator.language is missing', () => {
		vi.stubGlobal('navigator', {});

		expect(detectInitialLang()).toBe('uk');
	});

	it('does not throw when localStorage is blocked', () => {
		vi.stubGlobal('navigator', { language: 'en-US' });
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});

		expect(detectInitialLang()).toBe('en');
	});
});

describe('setLanguage', () => {
	afterEach(async () => {
		vi.restoreAllMocks();
		localStorage.clear();
		await i18n.changeLanguage('uk');
	});

	it('switches i18n, persists the choice and updates <html lang>', async () => {
		await setLanguage('en');

		expect(i18n.language).toBe('en');
		expect(currentLang()).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
		expect(document.documentElement.lang).toBe('en');
	});

	it('keeps <html lang> in sync on a plain changeLanguage (without persisting)', async () => {
		await i18n.changeLanguage('en');

		expect(document.documentElement.lang).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
	});

	it('still switches the language when localStorage.setItem throws', async () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});

		await expect(setLanguage('en')).resolves.toBeUndefined();
		expect(i18n.language).toBe('en');
	});
});
