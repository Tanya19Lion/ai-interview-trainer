import styles from './Tabs.module.css';

export interface TabItem {
	value: string;
	label: string;
}

export interface TabsProps {
	items: TabItem[];
	value: string;
	onChange: (value: string) => void;
}

/** Пілюльна група табів, напр. перемикач "Увійти" / "Зареєструватися" на екрані логіну. */
export function Tabs({ items, value, onChange }: TabsProps) {
	return (
		<div className={styles.tabs} role="tablist">
			{items.map((item) => {
				const active = item.value === value;
				return (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={active}
						className={[styles.tab, active ? styles.active : null].filter(Boolean).join(' ')}
						onClick={() => onChange(item.value)}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}