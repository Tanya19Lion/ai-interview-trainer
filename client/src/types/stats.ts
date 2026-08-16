import type { Topic } from './interview';

export interface TopicAccuracy {
	topic: Topic;
	/** 0..1 — уже поділено на 10 бекендом. */
	accuracy: number;
	/** Кількість відповіданих питань з цієї теми (по всіх сесіях). */
	count: number;
}

export interface StatsResponse {
	totalSessions: number;
	overallAccuracy: number | null;
	byTopic: TopicAccuracy[];
	streakDays: number;
}
