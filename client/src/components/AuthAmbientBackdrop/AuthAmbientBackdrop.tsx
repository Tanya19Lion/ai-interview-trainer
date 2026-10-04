import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CodeDiffLine } from '../CodeDiffLine/CodeDiffLine';
import { EditorComment } from '../EditorComment/EditorComment';
import { EditorWindow } from '../EditorWindow/EditorWindow';
import { LangToggle } from '../LangToggle/LangToggle';
import { LevelChip, ScoreChip } from '../Badge/Badge';
import styles from './AuthAmbientBackdrop.module.css';

/** Логотип-topbar і декоративна diff-картка, спільні для екранів автентифікації (LoginPage, ResetPasswordPage). */
export function AuthAmbientBackdrop() {
	const { t } = useTranslation();

	return (
		<>
			<div className={styles.topbar}>
				<Link to="/" className={styles.logo}>
					diff<span className={styles.cursor} aria-hidden="true" />
				</Link>
				<LangToggle />
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
						<ScoreChip tone="mid">{t('auth.backdrop.score')}</ScoreChip>
						<LevelChip>Middle · React</LevelChip>
					</>
				}
			>
				<CodeDiffLine gutter="12" variant="question">
					{t('auth.backdrop.q')}
				</CodeDiffLine>
				<CodeDiffLine gutter="13" variant="removed">
					{t('auth.backdrop.removed')}
				</CodeDiffLine>
				<CodeDiffLine gutter="13" variant="added">
					{t('auth.backdrop.added')}
				</CodeDiffLine>
				<EditorComment>{t('auth.backdrop.comment')}</EditorComment>
			</EditorWindow>
		</>
	);
}
