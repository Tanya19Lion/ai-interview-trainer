export const TOPICS = [
  'javascript',
  'system-design',
  'behavioral',
  'databases',
] as const;

export type Topic = (typeof TOPICS)[number];

export interface InterviewSession {
  id: string;
  userId: string;
  topic: Topic;
  status: 'pending' | 'in-progress' | 'completed';
}
