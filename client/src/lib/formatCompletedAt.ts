/** completedAt — ISO-дата завершення сесії, якщо вона вже завершена. */
export function formatCompletedAt(completedAt: string | undefined): string {
	return completedAt ? new Date(completedAt).toLocaleDateString('uk-UA') : '—';
}
