import { currentLang, LOCALE, type Lang } from '../i18n';

/** completedAt — ISO-дата завершення сесії, якщо вона вже завершена. */
export function formatCompletedAt(completedAt: string | undefined, lang: Lang = currentLang()): string {
	return completedAt ? new Date(completedAt).toLocaleDateString(LOCALE[lang]) : '—';
}
