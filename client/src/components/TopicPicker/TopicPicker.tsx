import { useTranslation } from 'react-i18next';
import { TOPICS, type Topic } from '../../types/interview';
import styles from './TopicPicker.module.css';

const TOPIC_META: Record<Topic, { tag: string }> = {
	react: { tag: '#react' },
	javascript: { tag: '#javascript' },
	nodejs: { tag: '#node.js' },
	typescript: { tag: '#typescript' },
	nextjs: { tag: '#next.js' },
	css: { tag: '#css' },
	html: { tag: '#html' },
	sql: { tag: '#sql' },
	restapi: { tag: '#restapi' },
	'system-design': { tag: '#system-design' },
};

export interface TopicPickerProps {
	value: Topic | null;
	onChange: (topic: Topic) => void;
}

export function TopicPicker({ value, onChange }: TopicPickerProps) {
	const { t } = useTranslation();
	return (
		<div className={styles.grid} role="radiogroup" aria-label={t('picker.topicAria')}>
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
						<div className={styles.desc}>{t(`topic.${topic}.desc`)}</div>
					</button>
				);
			})}
		</div>
	);
}
