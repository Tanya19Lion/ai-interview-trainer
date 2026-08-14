import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLogout, useMe } from '../../hooks/useAuth';
import type { InterviewFocusState } from '../../lib/interviewFocus';
import { ProgressSegments } from '../ProgressSegments/ProgressSegments';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
	{ to: '/', label: 'Кабінет', end: true },
	{ to: '/interview/new', label: 'Нова сесія', end: false },
	{ to: '/history', label: 'Історія', end: false },
	{ to: '/progress', label: 'Прогрес', end: false },
];

export interface AppShellProps {
	/** Коли задано — рендериться sticky focus-bar активної співбесіди замість звичайної навігації. */
	focus: InterviewFocusState | null;
}

export function AppShell({ focus }: AppShellProps) {
	const me = useMe();
	const logout = useLogout();
	const user = me.data?.user;

	return (
		<div className={styles.shell}>
			{focus ? <FocusBar focus={focus} /> : <MainNav user={user} onLogout={() => logout.mutate()} />}
			<main className={styles.main}>
				<Outlet />
			</main>
		</div>
	);
}

interface MainNavProps {
	user: { name: string; email: string; avatarUrl?: string } | undefined;
	onLogout: () => void;
}

function MainNav({ user, onLogout }: MainNavProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [menuOpen]);

	return (
		<nav className={styles.nav}>
			<div className={styles.navInner}>
				<span className={styles.logo}>
					diff<span className={styles.cursor} />
				</span>

				<div className={styles.tabs} role="tablist">
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.end}
							className={({ isActive }) =>
								[styles.tab, isActive ? styles.tabActive : null].filter(Boolean).join(' ')
							}
						>
							{item.label}
						</NavLink>
					))}
				</div>

				<div className={styles.right} ref={menuRef}>
					<button
						type="button"
						className={styles.avatarBtn}
						onClick={() => setMenuOpen((v) => !v)}
						aria-expanded={menuOpen}
						aria-label="Меню профілю"
					>
						{user?.avatarUrl ? (
							<img src={user.avatarUrl} alt="" className={styles.avatarImg} />
						) : (
							<span className={styles.avatarFallback}>
								{(user?.name ?? '?').charAt(0).toUpperCase()}
							</span>
						)}
					</button>
					{menuOpen && (
						<div className={styles.menu}>
							<div className={styles.menuUser}>
								<div className={styles.menuName}>{user?.name}</div>
								<div className={styles.menuEmail}>{user?.email}</div>
							</div>
							<button type="button" className={styles.menuItem} onClick={onLogout}>
								Вийти
							</button>
						</div>
					)}
				</div>
			</div>
		</nav>
	);
}

function FocusBar({ focus }: { focus: InterviewFocusState }) {
	return (
		<div className={styles.focusBar}>
			<div className={styles.focusInner}>
				<span className={styles.focusBranch}>{focus.branch}</span>
				<div className={styles.focusProgress}>
					<ProgressSegments total={focus.totalQuestions} currentIndex={focus.questionIndex} />
					<span className={styles.focusCounter}>
						{focus.questionIndex + 1} / {focus.totalQuestions}
					</span>
				</div>
				<button type="button" className={styles.focusExit} onClick={focus.onExit}>
					Завершити сесію
				</button>
			</div>
		</div>
	);
}