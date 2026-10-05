import Anthropic from '@anthropic-ai/sdk';
import type { Lang } from '../models/InterviewSession.js';

const MODEL = 'claude-sonnet-4-5';

let client: Anthropic | undefined;

function getClient(): Anthropic {
	if (!client) {
		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY is not set');
		}
		client = new Anthropic({ apiKey });
	}
	return client;
}

const LANGUAGE_NAME: Record<Lang, string> = { uk: 'Ukrainian', en: 'English' };

function languageInstruction(lang: Lang): string {
	return ` Write your entire response in ${LANGUAGE_NAME[lang]}.`;
}

export interface GeneratedQuestion {
	question: string;
}

export interface AnswerReview {
	score: number;
	feedback: string;
	correctAnswer: string;
	weakTopics: string[];
}

export async function generateQuestion(
	topic: string,
	level: string,
	askedQuestions: string[],
	lang: Lang,
): Promise<GeneratedQuestion> {
	const client = getClient();
	const message = await client.messages.create({
		model: MODEL,
		max_tokens: 300,
		system:
			'Ти генеруєш одне технічне питання для співбесіди на позицію фронтенд/бекенд-розробника. ' +
			'Відповідай лише текстом питання, без нумерації і без пояснень.' + 
			'Питання мають стосуватись сучасних підходів. Наприклад, 13-а версія Next.js не підтримується з 2024 року, тому підходи, які описані в цій версії, вважай неактуальними.' +
			'Такий підхід використовуй для будь-якої теми' +
			languageInstruction(lang),
		messages: [
			{
				role: 'user',
				content:
					`Тема: ${topic}. Рівень: ${level}. ` +
					(askedQuestions.length
						? `Не повторюй ці питання: ${askedQuestions.join(' | ')}.`
						: 'Це перше питання сесії.'),
			},
		],
	});

	const question = message.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('\n')
		.trim();

	return { question };
}

/** Прибирає markdown code-fence (```` ```json ... ``` ````), якщо модель його все ж додала
 * попри інструкцію в system-промпті не робити цього. */
export function parseAnswerReview(raw: string): AnswerReview {
	const cleaned = raw
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/```\s*$/, '')
		.trim();
	try {
		return JSON.parse(cleaned) as AnswerReview;
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new Error(
			`AI review response is not valid JSON (${reason}). Raw response (first 500 chars): ${cleaned.slice(0, 500)}`,
		);
	}
}

/** Для "Не знаю": просто відповідає на питання, без оцінювання і без JSON. */
export async function answerQuestion(
	topic: string,
	level: string,
	question: string,
	lang: Lang,
): Promise<string> {
	const client = getClient();
	const message = await client.messages.create({
		model: MODEL,
		max_tokens: 1024,
		system:
			'Ти технічний інтерв\'юер. Дай коротку, точну і сучасну еталонну відповідь на питання співбесіди. ' +
			'Відповідай лише текстом відповіді, без вступу і без markdown-огорожі.' +
				languageInstruction(lang),
		messages: [{ role: 'user', content: `Тема: ${topic}. Рівень: ${level}.\nПитання: ${question}` }],
	});

	return message.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('\n')
		.trim();
}

export async function reviewAnswer(
	topic: string,
	level: string,
	question: string,
	answer: string,
	lang: Lang,
): Promise<AnswerReview> {
	const client = getClient();
	const message = await client.messages.create({
		model: MODEL,
		max_tokens: 1024,
		system:
			"Ти рев'юєр технічної співбесіди. Оціни відповідь користувача на питання за темою і рівнем. " +
			'Поверни СУВОРО валідний JSON без markdown-огорожі у форматі: ' +
			'{"score": number 0-10, "feedback": string, "correctAnswer": string, "weakTopics": string[]}.' +
				languageInstruction(lang) +
				' JSON keys must stay exactly as specified.',
		messages: [
			{
				role: 'user',
				content: `Тема: ${topic}. Рівень: ${level}.\nПитання: ${question}\nВідповідь користувача: ${answer}`,
			},
		],
	});

	const raw = message.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('\n')
		.trim();

	return parseAnswerReview(raw);
}
