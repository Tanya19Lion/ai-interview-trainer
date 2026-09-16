import { Link } from 'react-router-dom';
import { CodeDiffLine } from '../CodeDiffLine/CodeDiffLine';
import { EditorComment } from '../EditorComment/EditorComment';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { LevelChip, ScoreChip } from '../Badge/Badge';
import styles from './AuthAmbientBackdrop.module.css';

/** Логотип-topbar і декоративна diff-картка, спільні для екранів автентифікації (LoginPage, ResetPasswordPage). */
export function AuthAmbientBackdrop() {
	return (
		<>
			<div className={styles.topbar}>
				<Link to="/" className={styles.logo}>
					diff<span className={styles.cursor} aria-hidden="true" />
				</Link>
			</div>

			<EditorWindow
				className={styles.ambientWrap}
				title={
					<>
						<b>session_04</b> · react/middle/answer.md
					</>
				}
				footer={
					<>
						<ScoreChip tone="mid">Точність: 6/10</ScoreChip>
						<LevelChip>Middle · React</LevelChip>
					</>
				}
			>
				<CodeDiffLine gutter="12" variant="question">
					// Q: Чим useMemo відрізняється від useCallback?
				</CodeDiffLine>
				<CodeDiffLine gutter="13" variant="removed">
					useMemo кешує функцію, а useCallback кешує значення.
				</CodeDiffLine>
				<CodeDiffLine gutter="13" variant="added">
					useMemo кешує значення (результат обчислення), а useCallback — саму функцію, щоб вона не
					створювалась заново.
				</CodeDiffLine>
				<EditorComment>Поширена плутанина. Memo → значення, Callback → сама функція.</EditorComment>
			</EditorWindow>
		</>
	);
}
