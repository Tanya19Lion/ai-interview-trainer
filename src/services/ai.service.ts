import Anthropic from '@anthropic-ai/sdk';

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
): Promise<GeneratedQuestion> {
	const client = getClient();
	const message = await client.messages.create({
		model: MODEL,
		max_tokens: 300,
		system:
			'Ти генеруєш одне технічне питання для співбесіди на позицію фронтенд/бекенд-розробника. ' +
			'Відповідай лише текстом питання, без нумерації і без пояснень.',
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

export async function reviewAnswer(
	topic: string,
	level: string,
	question: string,
	answer: string,
): Promise<AnswerReview> {
	const client = getClient();
	const message = await client.messages.create({
		model: MODEL,
		max_tokens: 600,
		system:
			"Ти рев'юєр технічної співбесіди. Оціни відповідь користувача на питання за темою і рівнем. " +
			'Поверни СУВОРО валідний JSON без markdown-огорожі у форматі: ' +
			'{"score": number 0-10, "feedback": string, "correctAnswer": string, "weakTopics": string[]}.',
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

	return JSON.parse(raw) as AnswerReview;
}
