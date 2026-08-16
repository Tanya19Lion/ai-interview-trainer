import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import uk from './locales/uk.json';

// Flat "section.key" strings ported straight from the diff-ai-interview-trainer.html mockup's
// TRANSLATIONS object — keySeparator/nsSeparator disabled so `t('hero.h1pre')` is looked up
// literally instead of i18next trying to nest it as { hero: { h1pre: ... } }.
i18n.use(initReactI18next).init({
	resources: {
		uk: { translation: uk },
		en: { translation: en },
	},
	lng: 'uk',
	fallbackLng: 'uk',
	keySeparator: false,
	nsSeparator: false,
	interpolation: { escapeValue: false },
});

export default i18n;
