export const TOPICS = ['react', 'javascript', 'nodejs', 'typescript', 'css', 'sql'] as const;
export type Topic = (typeof TOPICS)[number];

export const LEVELS = ['junior', 'middle', 'senior'] as const;
export type Level = (typeof LEVELS)[number];

export interface StartSessionRequest {
	topic: Topic;
	level: Level;
}

export interface StartSessionResponse {
	sessionId: string;
	questionIndex: number;
	totalQuestions: number;
	question: string;
}

export interface SubmitAnswerRequest {
	question: string;
	answer: string;
}

export interface AnswerReview {
	score: number;
	feedback: string;
	correctAnswer: string;
	weakTopics: string[];
}

export interface SubmitAnswerResponse {
	review: AnswerReview;
	done: boolean;
	averageScore?: number;
	questionIndex?: number;
	totalQuestions?: number;
	question?: string;
}
