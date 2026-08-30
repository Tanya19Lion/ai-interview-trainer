import type { Topic } from '../types/interview';

/** Текст теми як у макетах — переважно збігається зі значенням enum, крім двослівних назв. */
export const TOPIC_LABEL: Record<Topic, string> = {
	react: 'react',
	javascript: 'javascript',
	nodejs: 'node.js',
	typescript: 'typescript',
	nextjs: 'next.js',
	css: 'css',
	html: 'html',
	sql: 'sql',
	restapi: 'REST API',
};
