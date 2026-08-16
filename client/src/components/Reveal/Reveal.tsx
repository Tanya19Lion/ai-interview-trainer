import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './Reveal.module.css';

export interface RevealProps {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}

/** Фейд-ін + translateY при появі елемента у в'юпорті (одноразово), як `.reveal`/`.reveal.is-in`
 * у мокапі. Не рендерить нічого, коли reduced-motion — CSS-медіа-запит просто лишає opacity:1. */
export function Reveal({ children, className, style }: RevealProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [isIn, setIsIn] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (!('IntersectionObserver' in window)) {
			setIsIn(true);
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsIn(true);
						io.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			className={[styles.reveal, isIn ? styles.isIn : null, className].filter(Boolean).join(' ')}
			style={style}
		>
			{children}
		</div>
	);
}
