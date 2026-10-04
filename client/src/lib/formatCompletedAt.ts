import { currentLang, type Lang } from '../i18n';

const LOCALE: Record<Lang, string> = { uk: 'uk-UA', en: 'en-US' };

/** completedAt — ISO-дата завершення сесії, якщо вона вже завершена. */
export function formatCompletedAt(completedAt: string | undefined, lang: Lang = currentLang()): string {
	return completedAt ? new Date(completedAt).toLocaleDateString(LOCALE[lang]) : '—';
}
