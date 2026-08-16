export const TOPICS = [
	'react',
	'javascript',
	'nodejs',
	'typescript',
	'nextjs',
	'css',
	'html',
	'sql',
] as const;
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

export type SessionStatus = 'in_progress' | 'completed';

export interface ActiveSessionResponse {
	sessionId: string;
	topic: Topic;
	level: Level;
	questionIndex: number;
	totalQuestions: number;
	question: string;
}

export interface QuestionAttempt {
	question: string;
	answer: string;
	score: number;
	feedback: string;
	correctAnswer: string;
	weakTopics: string[];
}

export interface InterviewSessionDetail {
	id: string;
	topic: Topic;
	level: Level;
	status: SessionStatus;
	averageScore?: number;
	completedAt?: string;
	questions: QuestionAttempt[];
}

export interface HistorySessionSummary {
	id: string;
	topic: Topic;
	level: Level;
	averageScore?: number;
	completedAt?: string;
}

export interface HistoryFilters {
	topic?: Topic;
	level?: Level;
}

export interface HistoryResponse {
	sessions: HistorySessionSummary[];
}
