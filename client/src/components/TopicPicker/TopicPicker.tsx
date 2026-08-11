import { TOPICS, type Topic } from '../../types/interview';
import styles from './TopicPicker.module.css';

const TOPIC_META: Record<Topic, { tag: string; desc: string }> = {
	react: { tag: '#react', desc: 'Компоненти, хуки, рендер-цикл' },
	javascript: { tag: '#javascript', desc: 'Замикання, асинхронність, прототипи' },
	nodejs: { tag: '#node.js', desc: 'Event Loop, потоки, npm-екосистема' },
	typescript: { tag: '#typescript', desc: 'Типи, дженерики, строгість' },
	css: { tag: '#css', desc: 'Каскад, флекс/ґрід, специфічність' },
	sql: { tag: '#sql', desc: 'Джойни, індекси, нормалізація' },
};

export interface TopicPickerProps {
	value: Topic | null;
	onChange: (topic: Topic) => void;
}

export function TopicPicker({ value, onChange }: TopicPickerProps) {
	return (
		<div className={styles.grid} role="radiogroup" aria-label="Тема співбесіди">
			{TOPICS.map((topic) => {
				const meta = TOPIC_META[topic];
				const selected = value === topic;
				return (
					<button
						key={topic}
						type="button"
						role="radio"
						aria-checked={selected}
						className={[styles.card, selected ? styles.selected : null].filter(Boolean).join(' ')}
						onClick={() => onChange(topic)}
					>
						<span className={styles.tag}>{meta.tag}</span>
						<div className={styles.desc}>{meta.desc}</div>
					</button>
				);
			})}
		</div>
	);
}
