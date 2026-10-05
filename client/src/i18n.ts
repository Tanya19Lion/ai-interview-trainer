import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import uk from './locales/uk.json';
import { LANGS, type Lang } from './types/interview';

export { LANGS, type Lang };

/** BCP-47 локаль для `toLocaleDateString` / `Intl.DateTimeFormat` за мовою інтерфейсу. */
export const LOCALE: Record<Lang, string> = { uk: 'uk-UA', en: 'en-US' };

export const LANG_STORAGE_KEY = 'diff-lang-chosen';
const DEFAULT_LANG: Lang = 'uk';

/** Збережений вибір → мова браузера (uk* → uk, інакше en) → uk. Доступ до storage може кидати
 * виняток (приватний режим, заблоковані дані) — тоді мовчки йдемо до мови браузера. */
export function detectInitialLang(): Lang {
	try {
		const stored = localStorage.getItem(LANG_STORAGE_KEY);
		if (LANGS.includes(stored as Lang)) return stored as Lang;
	} catch {
		// storage недоступний — не страшно, визначаємо за браузером
	}
	const browser = typeof navigator === 'undefined' ? undefined : navigator.language;
	if (!browser) return DEFAULT_LANG;
	return browser.toLowerCase().startsWith('uk') ? 'uk' : 'en';
}

const initialLang = detectInitialLang();

// Flat "section.key" strings ported straight from the diff-ai-interview-trainer.html mockup's
// TRANSLATIONS object — keySeparator/nsSeparator disabled so `t('hero.h1pre')` is looked up
// literally instead of i18next trying to nest it as { hero: { h1pre: ... } }.
i18n.use(initReactI18next).init({
	resources: {
		uk: { translation: uk },
		en: { translation: en },
	},
	lng: initialLang,
	fallbackLng: DEFAULT_LANG,
	keySeparator: false,
	nsSeparator: false,
	interpolation: { escapeValue: false },
});

document.documentElement.lang = initialLang;
i18n.on('languageChanged', (lng) => {
	document.documentElement.lang = lng;
});

/** Поточна мова інтерфейсу, звужена до `Lang` (i18n.language може бути `en-US` тощо). */
export function currentLang(): Lang {
	return i18n.language === 'en' ? 'en' : 'uk';
}

/** Явний вибір користувача: міняє мову й запам'ятовує її (`LangOverlay` показується лише коли
 * цього ключа ще немає, тож звичайний `changeLanguage` його не пише). */
export async function setLanguage(lang: Lang): Promise<void> {
	await i18n.changeLanguage(lang);
	try {
		localStorage.setItem(LANG_STORAGE_KEY, lang);
	} catch {
		// не вдалося запам'ятати — мова все одно змінена для цієї вкладки
	}
}

export default i18n;
