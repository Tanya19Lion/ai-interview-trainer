# Повний i18n (клієнт + мова ШІ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перемикання UK/EN діє на весь застосунок, а ШІ ставить питання й дає фідбек мовою, зафіксованою при старті сесії.

**Architecture:** Лишаємо `react-i18next` з пласкими ключами (`keySeparator: false`) і двома файлами `uk.json`/`en.json`. Ядро (`i18n.ts`) отримує визначення мови (localStorage → `navigator.language` → `uk`), `setLanguage()` і `currentLang()`. На бекенді `InterviewSession.lang` (optional enum, без `default:` у схемі) задає мову всіх трьох AI-викликів сесії.

**Tech Stack:** React 19, i18next 26 / react-i18next 17, Vitest 2 + Testing Library (client, jsdom), Vitest (server), Express + Mongoose.

**Spec:** `docs/superpowers/specs/2026-10-04-i18n-completion-design.md`

## Global Constraints

- Ключі пласкі, формату `section.key`; `keySeparator: false`, `nsSeparator: false` не змінюємо. Нових бібліотек не додаємо.
- Мови рівно дві: `'uk' | 'en'`; запасна мова — `uk`.
- Перемикач мови зберігає вибір у `localStorage['diff-lang-chosen']` (той самий ключ, що вже використовує `LangOverlay`).
- Множини — через `_one/_few/_many/_other` (uk) і `_one/_other` (en) та `count`.
- `InterviewSession.lang`: optional, `enum: LANGS`, **без** `default:` у схемі (`.claude/rules/migrations.md`); fallback `'uk'` — у коді контролера. Запис у `docs/data-model.md` Schema-change log з rollback у прозі — обов'язковий.
- Серверні `res.json({ error })` лишаються англійською; клієнт їх не перекладає.
- `client/src/App.tsx` (dev-вітрина), `*.test.*` і коментарі — поза межами «жодного хардкоду».
- Тести клієнта працюють українською за замовчуванням: `testSetup.ts` скидає мову на `uk` перед кожним тестом.
- Комміти: Conventional Commits, з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; гілки `feat/<name>` від оновленого `main`; не комітити в `main`; PR як `--draft` (`CLAUDE.md`).
- PR-и ідуть **по одному**, у порядку A → B → C → D: кожну наступну гілку різати від `main` після мерджу попередньої (файли `uk.json`/`en.json` змінюють усі частини, паралельно вони конфліктуватимуть).
- Перед стартом: PR #31 (`fix/answer-label`) має бути змерджений — `uk.json` вже містить «Можлива відповідь», а `en.json` ще ні (це робить Task A5).

## Review Focus

1. **Збережена мова зіпсована або `localStorage` недоступний** (`'fr'`, `Storage` кидає виняток) → повертається до `navigator.language`, застосунок не падає (Task A1).
2. **Сесія створена до цієї зміни — без `lang`** → resume (`GET /active`) і `submitAnswer` працюють українською (Task D3).
3. **Українські множини** 1, 2–4, 5+, 11–14, 21, 22: «1 день / 2 дні / 5 днів / 11 днів / 21 день» (Task C5).
4. **Мову інтерфейсу змінено посеред співбесіди** → інтерфейс перемикається, сесія лишається своєю мовою, нічого не падає і не перезапитується (Task D4).
5. **`lang` у `POST /start` невалідний (`'fr'`, `null`, число)** → 400 з повідомленням, а не 500 і не тиха заміна на `uk` (Task D3).

---

## File Structure

**Part A (`feat/i18n-core`)**
- Modify `client/src/i18n.ts` — початкова мова, `setLanguage`, `currentLang`, `<html lang>`.
- Create `client/src/i18n.test.ts`.
- Modify `client/src/testSetup.ts` — скидання мови на `uk`.
- Create `client/src/components/LangToggle/LangToggle.tsx`, `LangToggle.module.css`, `LangToggle.test.tsx`.
- Modify `client/src/components/index.ts` — експорт `LangToggle`.
- Modify `client/src/components/LangOverlay/LangOverlay.tsx` (+ create `LangOverlay.test.tsx`).
- Modify `client/src/components/AppShell/AppShell.tsx` (лише вставка `<LangToggle />`) і `client/src/pages/LandingPage.tsx` (вставка `<LangToggle />`).
- Modify `client/src/lib/formatCompletedAt.ts` (+ create `formatCompletedAt.test.ts`).
- Modify `client/src/components/Heatmap/Heatmap.tsx` — місяці через `Intl`.
- Create `client/src/locales/locales.test.ts` — паритет ключів і змінних.
- Modify `client/src/locales/{uk,en}.json`.

**Part B (`feat/i18n-public-pages`)**: `RequireAuth.tsx`, `components/{Spinner,PasswordField,AuthAmbientBackdrop}`, `pages/{LoginPage,ResetPasswordPage}.tsx`, локалі.

**Part C (`feat/i18n-app-pages`)**: `AppShell`, `TopicPicker`, `LevelPicker`, `NewSessionPage`, `InterviewSessionPage`, `AnswerForm`, `FeedbackCard`, `ReviewModal`, `SessionSummary`, `HomePage`, `HistoryPage`, `HistoryTable`, `ProgressPage`, `Heatmap`, локалі, `client/src/noHardcodedCyrillic.test.ts`.

**Part D (`feat/ai-session-language`)**: `src/models/InterviewSession.ts`, `src/services/ai.service.ts`, `src/controllers/interview.controller.ts` (+ тести), `client/src/types/interview.ts`, `client/src/pages/NewSessionPage.tsx`, документація.

---

# Part A — ядро мови (`feat/i18n-core`)

### Task A0: Гілка

- [ ] **Step 1: Створити гілку від оновленого `main`**

```bash
cd /d/AI-interview-trainer && git checkout main && git pull --ff-only origin main && git checkout -b feat/i18n-core
```
Expected: `Switched to a new branch 'feat/i18n-core'`; якщо `pull --ff-only` відмовляє — зупинитись і з'ясувати чому (`CLAUDE.md`).

> Хук `block_sensitive_commit.py` шукає скрипт за відносним шляхом: усі Bash-команди плану запускати з кореня репозиторію й не лишати сесію в `client/` (команди нижче роблять `cd` у корінь у тому ж рядку, але **не** міняйте cwd сесії надовго).

### Task A1: Визначення, збереження і застосування мови

**Files:**
- Modify: `client/src/i18n.ts`
- Modify: `client/src/testSetup.ts`
- Test: `client/src/i18n.test.ts`

**Interfaces:**
- Produces: `type Lang = 'uk' | 'en'`; `const LANG_STORAGE_KEY = 'diff-lang-chosen'`; `detectInitialLang(): Lang`; `currentLang(): Lang`; `setLanguage(lang: Lang): Promise<void>`; default export `i18n`.

- [ ] **Step 1: Написати тест, що падає**

`client/src/i18n.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { LANG_STORAGE_KEY, currentLang, detectInitialLang, setLanguage } from './i18n';

describe('detectInitialLang', () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	it('prefers a stored choice over the browser language', () => {
		localStorage.setItem(LANG_STORAGE_KEY, 'en');
		vi.stubGlobal('navigator', { language: 'uk-UA' });

		expect(detectInitialLang()).toBe('en');
	});

	it('ignores a corrupt stored value and uses the browser language', () => {
		localStorage.setItem(LANG_STORAGE_KEY, 'fr');
		vi.stubGlobal('navigator', { language: 'uk-UA' });

		expect(detectInitialLang()).toBe('uk');
	});

	it('maps uk-* browser languages to uk and everything else to en', () => {
		vi.stubGlobal('navigator', { language: 'uk' });
		expect(detectInitialLang()).toBe('uk');

		vi.stubGlobal('navigator', { language: 'de-DE' });
		expect(detectInitialLang()).toBe('en');
	});

	it('falls back to uk when navigator.language is missing', () => {
		vi.stubGlobal('navigator', {});

		expect(detectInitialLang()).toBe('uk');
	});

	it('does not throw when localStorage is blocked', () => {
		vi.stubGlobal('navigator', { language: 'en-US' });
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});

		expect(detectInitialLang()).toBe('en');
		vi.restoreAllMocks();
	});
});

describe('setLanguage', () => {
	afterEach(async () => {
		localStorage.clear();
		await i18n.changeLanguage('uk');
	});

	it('switches i18n, persists the choice and updates <html lang>', async () => {
		await setLanguage('en');

		expect(i18n.language).toBe('en');
		expect(currentLang()).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
		expect(document.documentElement.lang).toBe('en');
	});

	it('keeps <html lang> in sync on a plain changeLanguage (without persisting)', async () => {
		await i18n.changeLanguage('en');

		expect(document.documentElement.lang).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
	});

	it('still switches the language when localStorage.setItem throws', async () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});

		await expect(setLanguage('en')).resolves.toBeUndefined();
		expect(i18n.language).toBe('en');
		vi.restoreAllMocks();
	});
});
```

- [ ] **Step 2: Запустити — має впасти**

Run: `cd /d/AI-interview-trainer/client && npx vitest run src/i18n.test.ts`
Expected: FAIL — `detectInitialLang`/`setLanguage`/`currentLang`/`LANG_STORAGE_KEY` не експортуються.

- [ ] **Step 3: Реалізувати `client/src/i18n.ts`** (замінити весь файл)

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import uk from './locales/uk.json';

export type Lang = 'uk' | 'en';

export const LANG_STORAGE_KEY = 'diff-lang-chosen';
const DEFAULT_LANG: Lang = 'uk';

/** Збережений вибір → мова браузера (uk* → uk, інакше en) → uk. Доступ до storage може кидати
 * виняток (приватний режим, заблоковані дані) — тоді мовчки йдемо до мови браузера. */
export function detectInitialLang(): Lang {
	try {
		const stored = localStorage.getItem(LANG_STORAGE_KEY);
		if (stored === 'uk' || stored === 'en') return stored;
	} catch {
		// storage недоступний — не страшно, визначаємо за браузером
	}
	const browser = typeof navigator === 'undefined' ? undefined : navigator.language;
	if (!browser) return DEFAULT_LANG;
	return browser.toLowerCase().startsWith('uk') ? 'uk' : 'en';
}

const initialLang = detectInitialLang();

// Flat "section.key" strings ported straight from the diff-ai-interview-trainer.html mockup's
// TRANSLATIONS object — keySeparator/nsSeparator disabled so `t('hero.h1pre')` is looked up
// literally instead of i18next trying to nest it as { hero: { h1pre: ... } }.
i18n.use(initReactI18next).init({
	resources: {
		uk: { translation: uk },
		en: { translation: en },
	},
	lng: initialLang,
	fallbackLng: DEFAULT_LANG,
	keySeparator: false,
	nsSeparator: false,
	interpolation: { escapeValue: false },
});

document.documentElement.lang = initialLang;
i18n.on('languageChanged', (lng) => {
	document.documentElement.lang = lng;
});

/** Поточна мова інтерфейсу, звужена до `Lang` (i18n.language може бути `en-US` тощо). */
export function currentLang(): Lang {
	return i18n.language === 'en' ? 'en' : 'uk';
}

/** Явний вибір користувача: міняє мову й запам'ятовує її (`LangOverlay` показується лише коли
 * цього ключа ще немає, тож звичайний `changeLanguage` його не пише). */
export async function setLanguage(lang: Lang): Promise<void> {
	await i18n.changeLanguage(lang);
	try {
		localStorage.setItem(LANG_STORAGE_KEY, lang);
	} catch {
		// не вдалося запам'ятати — мова все одно змінена для цієї вкладки
	}
}

export default i18n;
```

- [ ] **Step 4: Скидати мову в тестах** — `client/src/testSetup.ts` (замінити файл)

```ts
import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import i18n from './i18n';

// jsdom's navigator.language is "en-US", so language detection would start every test in English;
// the existing suites assert Ukrainian text.
beforeEach(async () => {
	localStorage.clear();
	await i18n.changeLanguage('uk');
});
```

- [ ] **Step 5: Запустити тест і весь клієнтський набір**

Run: `cd /d/AI-interview-trainer/client && npx vitest run`
Expected: PASS (усі наявні тести так само зелені).

- [ ] **Step 6: Commit**

```bash
cd /d/AI-interview-trainer && git add client/src/i18n.ts client/src/i18n.test.ts client/src/testSetup.ts && git commit -m "feat(client): detect, persist and apply the UI language" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task A2: `LangToggle`, `LangOverlay` через `setLanguage`, вставка в навігацію

**Files:**
- Create: `client/src/components/LangToggle/LangToggle.tsx`, `LangToggle.module.css`, `LangToggle.test.tsx`
- Create: `client/src/components/LangOverlay/LangOverlay.test.tsx`
- Modify: `client/src/components/LangOverlay/LangOverlay.tsx`, `client/src/components/index.ts`, `client/src/components/AppShell/AppShell.tsx`, `client/src/pages/LandingPage.tsx`, `client/src/locales/uk.json`, `client/src/locales/en.json`

**Interfaces:**
- Consumes: `setLanguage`, `LANG_STORAGE_KEY` (A1).
- Produces: `<LangToggle />` (без props); ключі `lang.switchAria` (з `{{lang}}`) і `lang.overlayAria`.

- [ ] **Step 1: Додати ключі** — в кінець `uk.json` і `en.json` (перед `}`; додати кому після попереднього останнього запису)

`uk.json`:
```json
	"lang.switchAria": "Змінити мову на {{lang}}",
	"lang.overlayAria": "Language selection / Вибір мови"
```
`en.json`:
```json
	"lang.switchAria": "Switch language to {{lang}}",
	"lang.overlayAria": "Language selection / Вибір мови"
```

- [ ] **Step 2: Тест `LangToggle` (падає)** — `client/src/components/LangToggle/LangToggle.test.tsx`

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n, { LANG_STORAGE_KEY } from '../../i18n';
import { LangToggle } from './LangToggle';

describe('LangToggle', () => {
	afterEach(() => cleanup());

	it('offers the other language: shows EN while the UI is Ukrainian', () => {
		render(<LangToggle />);

		const button = screen.getByRole('button', { name: 'Змінити мову на English' });
		expect(button).toHaveTextContent('EN');
	});

	it('switches to English on click and persists the choice', async () => {
		const user = userEvent.setup();
		render(<LangToggle />);

		await user.click(screen.getByRole('button'));

		expect(i18n.language).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
		expect(screen.getByRole('button', { name: 'Switch language to Українська' })).toHaveTextContent('UK');
	});
});
```

- [ ] **Step 3: Run — FAIL** (`LangToggle` не існує)

Run: `cd /d/AI-interview-trainer/client && npx vitest run src/components/LangToggle`

- [ ] **Step 4: Реалізація**

`client/src/components/LangToggle/LangToggle.tsx`:
```tsx
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../i18n';
import { buttonClassName } from '../Button/buttonClassName';
import styles from './LangToggle.module.css';

/** Перемикач UK/EN: показує код мови, на яку перемкне (як ThemeToggle показує дію, а не стан). */
export function LangToggle() {
	const { t, i18n } = useTranslation();
	const next = i18n.language === 'en' ? 'uk' : 'en';

	return (
		<button
			type="button"
			className={buttonClassName({ variant: 'ghost', size: 'md', className: styles.toggle })}
			onClick={() => setLanguage(next)}
			aria-label={t('lang.switchAria', { lang: t(`lang.${next}`) })}
		>
			{next.toUpperCase()}
		</button>
	);
}
```
`client/src/components/LangToggle/LangToggle.module.css`:
```css
.toggle {
	padding: 0.62rem 0.7rem;
	justify-content: center;
	font-family: var(--font-mono);
	font-size: 0.8rem;
	font-weight: 600;
	letter-spacing: 0.04em;
}
```
`client/src/components/index.ts` — після рядка з `ThemeToggle` (рядок 51) додати:
```ts
export { LangToggle } from './LangToggle/LangToggle';
```

- [ ] **Step 5: Run — PASS**

Run: `cd /d/AI-interview-trainer/client && npx vitest run src/components/LangToggle`

- [ ] **Step 6: `LangOverlay` на `setLanguage` + тест**

У `LangOverlay.tsx`: видалити рядок `const STORAGE_KEY = 'diff-lang-chosen';`, додати імпорт, замінити тіло `choose` і `aria-label`:
```tsx
import { LANG_STORAGE_KEY, setLanguage } from '../../i18n';
// ...
useEffect(() => {
	try {
		if (!localStorage.getItem(LANG_STORAGE_KEY)) setVisible(true);
	} catch {
		setVisible(true);
	}
}, []);
// ...
function choose(lang: 'uk' | 'en') {
	setLanguage(lang);
	setLeaving(true);
	setTimeout(() => setVisible(false), 250);
}
// ...
aria-label={t('lang.overlayAria')}
```
`client/src/components/LangOverlay/LangOverlay.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n, { LANG_STORAGE_KEY } from '../../i18n';
import { LangOverlay } from './LangOverlay';

describe('LangOverlay', () => {
	afterEach(() => cleanup());

	it('is shown until a language has been chosen', () => {
		render(<LangOverlay />);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('is not shown once a choice is stored', () => {
		localStorage.setItem(LANG_STORAGE_KEY, 'uk');
		render(<LangOverlay />);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('choosing English switches the UI and stores the choice', async () => {
		const user = userEvent.setup();
		render(<LangOverlay />);

		await user.click(screen.getByRole('button', { name: 'English' }));

		expect(i18n.language).toBe('en');
		expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
	});
});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/components/LangOverlay` → PASS.

- [ ] **Step 7: Вставити перемикач у навігацію**

`AppShell.tsx` — у імпорті `import { ThemeToggle } from '../ThemeToggle/ThemeToggle';` додати наступним рядком `import { LangToggle } from '../LangToggle/LangToggle';`; у `MainNav` перед `<ThemeToggle />` (рядок ~79) вставити `<LangToggle />`.
`LandingPage.tsx` — у `import { ... ThemeToggle } from '../components'` додати `LangToggle,` (абетково перед `LevelChip`); перед `<ThemeToggle />` (рядок ~133) вставити `<LangToggle />`.

- [ ] **Step 8: Весь клієнтський набір + lint + build**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Expected: усе зелене.

- [ ] **Step 9: Commit**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): add a persistent UK/EN language toggle" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task A3: Дати й місяці за поточною мовою

**Files:**
- Modify: `client/src/lib/formatCompletedAt.ts`, `client/src/components/Heatmap/Heatmap.tsx`
- Test: `client/src/lib/formatCompletedAt.test.ts`

**Interfaces:**
- Consumes: `currentLang` (A1).
- Produces: `formatCompletedAt(completedAt: string | undefined, lang: Lang = currentLang()): string`.

- [ ] **Step 1: Тест (падає)** — `client/src/lib/formatCompletedAt.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatCompletedAt } from './formatCompletedAt';

// Local noon: the calendar day is the same in every timezone the CI could use.
const ISO = new Date(2026, 9, 4, 12, 0, 0).toISOString();

describe('formatCompletedAt', () => {
	it('returns an em dash for an unfinished session', () => {
		expect(formatCompletedAt(undefined)).toBe('—');
	});

	it('formats the date the Ukrainian way', () => {
		expect(formatCompletedAt(ISO, 'uk')).toBe('04.10.2026');
	});

	it('formats the date the English way', () => {
		expect(formatCompletedAt(ISO, 'en')).toBe('10/4/2026');
	});

	it('follows the current UI language by default', async () => {
		const { default: i18n } = await import('../i18n');
		await i18n.changeLanguage('en');

		expect(formatCompletedAt(ISO)).toBe('10/4/2026');
	});
});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/lib/formatCompletedAt.test.ts` → FAIL (`'uk'` ігнорується, завжди `uk-UA`; третій тест дасть `04.10.2026`).

- [ ] **Step 2: Реалізація** — `client/src/lib/formatCompletedAt.ts`

```ts
import { currentLang, type Lang } from '../i18n';

const LOCALE: Record<Lang, string> = { uk: 'uk-UA', en: 'en-US' };

/** completedAt — ISO-дата завершення сесії, якщо вона вже завершена. */
export function formatCompletedAt(completedAt: string | undefined, lang: Lang = currentLang()): string {
	return completedAt ? new Date(completedAt).toLocaleDateString(LOCALE[lang]) : '—';
}
```
Run тест → PASS. (Якщо Node без повного ICU видає інший формат для `en-US` — тест перевіряє `10/4/2026`; повний ICU є в Node ≥ 13.)

- [ ] **Step 3: Місяці в `Heatmap` через `Intl`** (рядки лишаються в Part C; тут лише місяці)

У `Heatmap.tsx`: видалити константу `MONTH_LABELS_UK` (рядки 7–20). Додати імпорти `import { useTranslation } from 'react-i18next';` і `import { currentLang } from '../../i18n';`, а в тілі компонента перед `useMemo` — `const { i18n } = useTranslation();` (щоб компонент перерендерювався при зміні мови). У `useMemo` замінити
```ts
return MONTH_LABELS_UK[date.getUTCMonth()];
```
на
```ts
return monthFormat.format(date);
```
і перед `const labelCount = 12;` додати
```ts
const monthFormat = new Intl.DateTimeFormat(currentLang() === 'en' ? 'en-US' : 'uk-UA', {
	month: 'short',
	timeZone: 'UTC',
});
```
У масив залежностей `useMemo` замінити `[completedDates]` на `[completedDates, i18n.language]`.

- [ ] **Step 4: Lint/тип/тести**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Expected: зелене. (Українські скорочення від `Intl` — «січ.», «лют.» з крапкою; це прийнятна зміна вигляду підписів місяців, зазначити в PR.)

- [ ] **Step 5: Commit**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): format dates and heatmap months for the active language" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task A4: Тест паритету локалей

**Files:**
- Create: `client/src/locales/locales.test.ts`

- [ ] **Step 1: Написати тест** (одразу має пройти на поточних файлах; він лишається гвардією для Part B–D)

```ts
import { describe, expect, it } from 'vitest';
import en from './en.json';
import uk from './uk.json';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function baseKey(key: string): string {
	return key.replace(PLURAL_SUFFIX, '');
}

function placeholders(value: string): string[] {
	return [...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
}

function groupByBase(dict: Record<string, string>): Map<string, Set<string>> {
	const groups = new Map<string, Set<string>>();
	for (const [key, value] of Object.entries(dict)) {
		const set = groups.get(baseKey(key)) ?? new Set<string>();
		placeholders(value).forEach((p) => set.add(p));
		groups.set(baseKey(key), set);
	}
	return groups;
}

describe('locales', () => {
	const ukGroups = groupByBase(uk);
	const enGroups = groupByBase(en);

	it('uk.json and en.json define the same keys (plural forms collapsed)', () => {
		expect([...ukGroups.keys()].sort()).toEqual([...enGroups.keys()].sort());
	});

	it('both languages use the same interpolation variables for every key', () => {
		for (const [key, vars] of ukGroups) {
			expect({ key, vars: [...vars].sort() }).toEqual({ key, vars: [...(enGroups.get(key) ?? [])].sort() });
		}
	});
});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/locales`
Expected: PASS на поточному стані. Якщо падає — `uk.json`/`en.json` уже розходяться; виправити розбіжність у цьому ж коміті, не послабляючи тест.

- [ ] **Step 2: Commit**

```bash
cd /d/AI-interview-trainer && git add client/src/locales/locales.test.ts && git commit -m "test(client): guard uk/en locale parity and interpolation variables" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task A5: Англійський `card.betterAnswer`, перевірка, PR

**Files:**
- Modify: `client/src/locales/en.json:45`
- Test: `client/src/components/FeedbackCard/FeedbackCard.test.tsx` (додати тест)

- [ ] **Step 1: Тест (падає)** — додати до `describe` у `FeedbackCard.test.tsx` (імпорт `i18n` з `'../../i18n'` і `afterEach(() => cleanup())` уже є/додати за зразком файлу). Підписи в `FeedbackCard.tsx` ще хардкод (Part C), тому тест стосується лише ключа `card.betterAnswer` на лендингу — перевірити його напряму:

`client/src/locales/locales.test.ts` — додати в кінець `describe`:
```ts
	it('words the model answer as a possibility, not a verdict', () => {
		expect(uk['card.betterAnswer']).toBe('Можлива відповідь');
		expect(en['card.betterAnswer']).toBe('A possible answer');
	});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/locales` → FAIL (en: `The better answer is`).

- [ ] **Step 2: Виправити** — `en.json` рядок 45: `"card.betterAnswer": "A possible answer",`. Run тест → PASS.

- [ ] **Step 3: Повна перевірка**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Вручну (без живого Mongo): `npm run dev` → відкрити `/`, перемкнути UK↔EN кнопкою в навігації, перезавантажити сторінку — мова зберігається; `<html lang>` змінюється; `LangOverlay` не з'являється повторно.

- [ ] **Step 4: Commit, push, чернетка PR**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "fix(client): word the English model-answer label as a possibility" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" && git pull --ff-only origin main && git push -u origin feat/i18n-core
gh pr create --draft --base main --head feat/i18n-core --title "feat(client): i18n core — language detection, persistence and toggle" --body "$(cat <<'EOF'
## What changed
- `i18n.ts`: initial language from `localStorage` → `navigator.language` → `uk`; `setLanguage`/`currentLang`; `<html lang>` follows the language.
- New `LangToggle` in `AppShell` and on the landing nav; `LangOverlay` now persists through `setLanguage`.
- `formatCompletedAt` and `Heatmap` month labels follow the active language.
- Locale parity test (keys + interpolation variables); `testSetup.ts` resets the language to `uk` per test.
- English `card.betterAnswer` → "A possible answer".

## Why
Part 1 of 4 of the full i18n (spec: `docs/superpowers/specs/2026-10-04-i18n-completion-design.md`). The overlay stored the choice but `i18n.ts` never read it, so English was lost on reload.

## How to check
- `cd client && npx vitest run && npm run lint && npm run build`
- Switch UK/EN on `/`, reload — language persists. Ukrainian month labels in the heatmap now come from `Intl` (e.g. «січ.»).

## Related issues
Part of the landing-page language toggle task (`docs/PRD.md`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Part B — публічні сторінки та спільні поля (`feat/i18n-public-pages`)

Починати після мерджу Part A: `git checkout main && git pull --ff-only origin main && git checkout -b feat/i18n-public-pages`.

### Task B1: Спільні компоненти (`Spinner`, `PasswordField`, `RequireAuth`, `AuthAmbientBackdrop`)

**Files:**
- Modify: `client/src/components/Spinner/Spinner.tsx`, `client/src/components/PasswordField/PasswordField.tsx`, `client/src/RequireAuth.tsx`, `client/src/components/AuthAmbientBackdrop/AuthAmbientBackdrop.tsx`, `client/src/locales/{uk,en}.json`
- Test: `client/src/components/PasswordField/PasswordField.test.tsx`

**Interfaces:**
- Produces: ключі `common.loading`, `common.tagline`, `auth.checkingSession`, `auth.showPassword`, `auth.hidePassword`, `auth.backdrop.{score,q,removed,added,comment}` (використовуються в B2/B3 і C).

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"common.loading": "Завантаження…",
	"common.tagline": "diff — порівняй. виправ. пройди.",
	"auth.checkingSession": "Перевірка сесії…",
	"auth.showPassword": "Показати пароль",
	"auth.hidePassword": "Приховати пароль",
	"auth.backdrop.score": "Точність: 6/10",
	"auth.backdrop.q": "// Q: Чим useMemo відрізняється від useCallback?",
	"auth.backdrop.removed": "useMemo кешує функцію, а useCallback кешує значення.",
	"auth.backdrop.added": "useMemo кешує значення (результат обчислення), а useCallback — саму функцію, щоб вона не створювалась заново.",
	"auth.backdrop.comment": "Поширена плутанина. Memo → значення, Callback → сама функція."
```
`en.json`:
```json
	"common.loading": "Loading…",
	"common.tagline": "diff — compare. fix. pass.",
	"auth.checkingSession": "Checking your session…",
	"auth.showPassword": "Show password",
	"auth.hidePassword": "Hide password",
	"auth.backdrop.score": "Accuracy: 6/10",
	"auth.backdrop.q": "// Q: How does useMemo differ from useCallback?",
	"auth.backdrop.removed": "useMemo caches the function, and useCallback caches the value.",
	"auth.backdrop.added": "useMemo caches the value (the result of a computation), while useCallback caches the function itself, so it isn't re-created.",
	"auth.backdrop.comment": "A common mix-up. Memo → a value, Callback → the function itself."
```

- [ ] **Step 2: Тест `PasswordField` (падає)** — `client/src/components/PasswordField/PasswordField.test.tsx`

Спочатку `Read` `PasswordField.tsx`, щоб побачити обов'язкові props (мінімум `label`, `value`, `onChange`). Тест:
```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
	afterEach(() => cleanup());

	it.each([
		['uk', 'Показати пароль'],
		['en', 'Show password'],
	])('labels the reveal button in %s', async (lang, label) => {
		await i18n.changeLanguage(lang);
		render(<PasswordField label="Password" value="" onChange={vi.fn()} />);

		expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
	});
});
```
Run → FAIL для `en`.

- [ ] **Step 3: Заміни в коді**

| Файл:рядок | Було | Стало |
|---|---|---|
| `Spinner.tsx:11` | `'aria-label': ariaLabel = 'Завантаження…',` | прибрати дефолт з деструктуризації: `'aria-label': ariaLabel,` і в тілі `const { t } = useTranslation();` + `aria-label={ariaLabel ?? t('common.loading')}` (імпорт `useTranslation` з `react-i18next`) |
| `RequireAuth.tsx:12` | `<Spinner aria-label="Перевірка сесії…" />` | `<Spinner aria-label={t('auth.checkingSession')} />`, додати `const { t } = useTranslation();` на початку компонента **до** будь-якого раннього `return` (правило хуків) |
| `PasswordField.tsx:64` | `aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}` | `aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}`; `const { t } = useTranslation();` у компоненті |
| `AuthAmbientBackdrop.tsx:27` | `Точність: 6/10` | `{t('auth.backdrop.score')}` |
| `AuthAmbientBackdrop.tsx:33` | `// Q: Чим useMemo відрізняється від useCallback?` (JSX-текст) | `{t('auth.backdrop.q')}` |
| `AuthAmbientBackdrop.tsx:36` | `useMemo кешує функцію, а useCallback кешує значення.` | `{t('auth.backdrop.removed')}` |
| `AuthAmbientBackdrop.tsx:39-40` | `useMemo кешує значення … створювалась заново.` | `{t('auth.backdrop.added')}` |
| `AuthAmbientBackdrop.tsx:42` | `Поширена плутанина. Memo → …` | `{t('auth.backdrop.comment')}` |

У `AuthAmbientBackdrop` додати `const { t } = useTranslation();` і імпорт. Зберегти існуючу структуру JSX (`CodeDiffLine`, `EditorComment`) — міняється лише текст.

- [ ] **Step 4: Запустити**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Expected: зелене (паритет-тест A4 підтверджує, що uk/en ключі однакові).

- [ ] **Step 5: Commit**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate shared auth components" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task B2: `LoginPage`

**Files:**
- Modify: `client/src/pages/LoginPage.tsx`, `client/src/locales/{uk,en}.json`

**Interfaces:**
- Consumes: `common.tagline`, `auth.*` з B1.
- Produces: ключі `auth.signIn`, `auth.signUp`, `auth.password`, `auth.passwordPlaceholder`, `auth.passwordHint`, `login.*` (B3 перевикористовує `auth.*`).

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"auth.signIn": "Увійти",
	"auth.signUp": "Зареєструватися",
	"auth.password": "Пароль",
	"auth.passwordPlaceholder": "мінімум 8 символів",
	"auth.passwordHint": "Мінімум 8 символів",
	"login.h1": "Один акаунт. Уся історія твоїх співбесід.",
	"login.subtitle.signin": "Введи email і пароль — або обери Google, це швидше.",
	"login.subtitle.signup": "Створи акаунт за хвилину — або зареєструйся через Google, ще швидше.",
	"login.switch.signin": "Ще немає акаунта?",
	"login.switch.signup": "Вже є акаунт?",
	"login.scopeNote": "# доступ лише до email та імені — жодного Gmail чи Диску",
	"login.or": "або",
	"login.forgot": "Забули пароль?",
	"login.signingIn": "Входимо…",
	"login.name": "Ім'я",
	"login.namePlaceholder": "Таня",
	"login.creating": "Створюємо акаунт…",
	"login.create": "Створити акаунт",
	"login.terms": "Продовжуючи, ти погоджуєшся з <terms>Умовами використання</terms> та <privacy>Політикою конфіденційності</privacy> diff."
```
`en.json`:
```json
	"auth.signIn": "Sign in",
	"auth.signUp": "Sign up",
	"auth.password": "Password",
	"auth.passwordPlaceholder": "at least 8 characters",
	"auth.passwordHint": "At least 8 characters",
	"login.h1": "One account. Your whole interview history.",
	"login.subtitle.signin": "Enter your email and password — or pick Google, it's faster.",
	"login.subtitle.signup": "Create an account in a minute — or sign up with Google, even faster.",
	"login.switch.signin": "No account yet?",
	"login.switch.signup": "Already have an account?",
	"login.scopeNote": "# access to your email and name only — no Gmail or Drive",
	"login.or": "or",
	"login.forgot": "Forgot password?",
	"login.signingIn": "Signing in…",
	"login.name": "Name",
	"login.namePlaceholder": "Tanya",
	"login.creating": "Creating account…",
	"login.create": "Create account",
	"login.terms": "By continuing, you agree to the <terms>Terms of Use</terms> and <privacy>Privacy Policy</privacy> of diff."
```

- [ ] **Step 2: Рефакторинг модульних констант** (`LoginPage.tsx:13-19`) — тексти переходять з констант у ключі

Було:
```tsx
	signin: 'Введи email і пароль — або обери Google, це швидше.',
	signup: 'Створи акаунт за хвилину — або зареєструйся через Google, ще швидше.',
...
	signin: { question: 'Ще немає акаунта?', action: 'Зареєструватися', target: 'signup' },
	signup: { question: 'Вже є акаунт?', action: 'Увійти', target: 'signin' },
```
Стало (константи зберігають лише ключі):
```tsx
const SUBTITLE_KEY = { signin: 'login.subtitle.signin', signup: 'login.subtitle.signup' } as const;

const SWITCH = {
	signin: { questionKey: 'login.switch.signin', actionKey: 'auth.signUp', target: 'signup' },
	signup: { questionKey: 'login.switch.signup', actionKey: 'auth.signIn', target: 'signin' },
} as const;
```
Прочитати, як ці константи називаються і використовуються в тілі компонента (`Read` рядки 1–70, 165–190), і замінити використання на `t(SUBTITLE_KEY[mode])`, `t(SWITCH[mode].questionKey)`, `t(SWITCH[mode].actionKey)`. Додати `const { t } = useTranslation();` і `import { Trans, useTranslation } from 'react-i18next';`.

- [ ] **Step 3: Решта заміни**

| Рядок | Було | Стало |
|---|---|---|
| 74 | `Один акаунт. Уся історія твоїх співбесід.` | `{t('login.h1')}` |
| 82–83 | `label: 'Увійти'` / `label: 'Зареєструватися'` | `label: t('auth.signIn')` / `label: t('auth.signUp')` |
| 98 | `# доступ лише до email …` | `{t('login.scopeNote')}` |
| 101 | `<span>або</span>` | `<span>{t('login.or')}</span>` |
| 116, 152 | `label="Пароль"` | `label={t('auth.password')}` |
| 119 | `Забули пароль?` | `{t('login.forgot')}` |
| 129 | `{login.isPending ? 'Входимо…' : 'Увійти'}` | `{login.isPending ? t('login.signingIn') : t('auth.signIn')}` |
| 135–136 | `label="Ім'я"` / `placeholder="Таня"` | `label={t('login.name')}` / `placeholder={t('login.namePlaceholder')}` |
| 153, 157 | `placeholder="мінімум 8 символів"` / `hint="Мінімум 8 символів"` | `placeholder={t('auth.passwordPlaceholder')}` / `hint={t('auth.passwordHint')}` |
| 162 | `{register.isPending ? 'Створюємо акаунт…' : 'Створити акаунт'}` | `{register.isPending ? t('login.creating') : t('login.create')}` |
| 181–182 | `Продовжуючи, ти погоджуєшся з <a href="#">Умовами використання</a> та{' '}<a href="#">Політикою конфіденційності</a> diff.` | `<Trans i18nKey="login.terms" components={{ terms: <a href="#" />, privacy: <a href="#" /> }} />` |
| 187 | `diff — порівняй. виправ. пройди.` | `{t('common.tagline')}` |

- [ ] **Step 4: Перевірка**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Expected: зелене. Вручну `npm run dev` → `/login` у UK та EN: обидві вкладки, «Забули пароль?», футер.

- [ ] **Step 5: Commit**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate the login page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task B3: `ResetPasswordPage`

**Files:**
- Modify: `client/src/pages/ResetPasswordPage.tsx`, `client/src/locales/{uk,en}.json`

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"reset.checkTitle": "Перевір пошту",
	"reset.checkBody": "Якщо акаунт з адресою <b>{{email}}</b> існує, ми надіслали лінк для відновлення пароля.",
	"reset.back": "← Повернутися до входу",
	"reset.forgotTitle": "Забули пароль?",
	"reset.forgotSubtitle": "Введи email — надішлемо лінк для відновлення.",
	"reset.send": "Надіслати лінк",
	"reset.sending": "Надсилаємо…",
	"reset.remembered": "Згадав(-ла) пароль?",
	"reset.mismatch": "Паролі не збігаються",
	"reset.doneTitle": "Пароль змінено",
	"reset.doneBody": "Тепер можеш увійти з новим паролем.",
	"reset.newTitle": "Новий пароль",
	"reset.newSubtitle": "Введи новий пароль для свого акаунта.",
	"reset.newLabel": "Новий пароль",
	"reset.confirmLabel": "Підтвердь пароль",
	"reset.save": "Змінити пароль",
	"reset.saving": "Зберігаємо…"
```
`en.json`:
```json
	"reset.checkTitle": "Check your email",
	"reset.checkBody": "If an account with <b>{{email}}</b> exists, we've sent a password reset link.",
	"reset.back": "← Back to sign in",
	"reset.forgotTitle": "Forgot your password?",
	"reset.forgotSubtitle": "Enter your email — we'll send a reset link.",
	"reset.send": "Send link",
	"reset.sending": "Sending…",
	"reset.remembered": "Remembered your password?",
	"reset.mismatch": "Passwords don't match",
	"reset.doneTitle": "Password changed",
	"reset.doneBody": "You can now sign in with your new password.",
	"reset.newTitle": "New password",
	"reset.newSubtitle": "Enter a new password for your account.",
	"reset.newLabel": "New password",
	"reset.confirmLabel": "Confirm password",
	"reset.save": "Change password",
	"reset.saving": "Saving…"
```

- [ ] **Step 2: Заміни** (файл має кілька функцій-компонентів: форма запиту, екран «перевір пошту», форма нового пароля, екран «готово» — додати `const { t } = useTranslation();` у **кожну** функцію, що рендерить текст; `Read` файл повністю перед правкою)

| Рядок | Було | Стало |
|---|---|---|
| 26 | `Перевір пошту` | `{t('reset.checkTitle')}` |
| 28 | `Якщо акаунт з адресою <b>{email}</b> існує, ми надіслали …` | `<Trans i18nKey="reset.checkBody" values={{ email }} components={{ b: <b /> }} />` |
| 31 | `← Повернутися до входу` | `{t('reset.back')}` |
| 40 | `Забули пароль?` | `{t('reset.forgotTitle')}` |
| 41 | `Введи email — надішлемо лінк для відновлення.` | `{t('reset.forgotSubtitle')}` |
| 54 | `{pending ? 'Надсилаємо…' : 'Надіслати лінк'}` | `{pending ? t('reset.sending') : t('reset.send')}` |
| 59 | `Згадав(-ла) пароль? <Link …>Увійти</Link>` | `{t('reset.remembered')} <Link …>{t('auth.signIn')}</Link>` |
| 75 | `setError('Паролі не збігаються')` | `setError(t('reset.mismatch'))` |
| 86–87 | `Пароль змінено` / `Тепер можеш увійти з новим паролем.` | `{t('reset.doneTitle')}` / `{t('reset.doneBody')}` |
| 90 | `Увійти` | `{t('auth.signIn')}` |
| 100–101 | `Новий пароль` / `Введи новий пароль для свого акаунта.` | `{t('reset.newTitle')}` / `{t('reset.newSubtitle')}` |
| 105–106, 110 | `label="Новий пароль"`, `placeholder="мінімум 8 символів"`, `hint="Мінімум 8 символів"` | `label={t('reset.newLabel')}`, `placeholder={t('auth.passwordPlaceholder')}`, `hint={t('auth.passwordHint')}` |
| 115 | `label="Підтвердь пароль"` | `label={t('reset.confirmLabel')}` |
| 124 | `{pending ? 'Зберігаємо…' : 'Змінити пароль'}` | `{pending ? t('reset.saving') : t('reset.save')}` |
| 147 | `diff — порівняй. виправ. пройди.` | `{t('common.tagline')}` |

Особливий випадок: `setError(t('reset.mismatch'))` зберігає вже перекладений текст у стані, тож після перемикання мови посеред форми помилка лишиться старою мовою. Прийнятно (одноразове повідомлення); не ускладнювати.

- [ ] **Step 3: Перевірка, commit, push, PR**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build` → зелене.
Вручну: `/login` → «Забули пароль?» у UK і EN; `/reset-password` (як у `AppRoutes.tsx`) — усі три стани.
```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate the reset-password page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" && git pull --ff-only origin main && git push -u origin feat/i18n-public-pages
gh pr create --draft --base main --head feat/i18n-public-pages --title "feat(client): translate login, reset-password and shared auth fields" --body "$(cat <<'EOF'
## What changed
- `LoginPage`, `ResetPasswordPage`, `AuthAmbientBackdrop`, `PasswordField`, `Spinner`, `RequireAuth` read all text from `uk.json`/`en.json`.
- Terms/privacy sentence and the "check your email" body use `<Trans>` so the links/bold survive translation.

## Why
Part 2 of 4 of the full i18n (spec: `docs/superpowers/specs/2026-10-04-i18n-completion-design.md`).

## How to check
- `cd client && npx vitest run && npm run lint && npm run build`
- Toggle UK/EN on `/login` and the reset-password screens.

## Related issues
None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Part C — сторінки за авторизацією (`feat/i18n-app-pages`)

Починати після мерджу Part B: `git checkout main && git pull --ff-only origin main && git checkout -b feat/i18n-app-pages`.

### Task C1: `AppShell`, `TopicPicker`, `LevelPicker`

**Files:**
- Modify: `client/src/components/AppShell/AppShell.tsx`, `client/src/components/TopicPicker/TopicPicker.tsx`, `client/src/components/LevelPicker/LevelPicker.tsx`, `client/src/locales/{uk,en}.json`

**Interfaces:**
- Produces: ключі `shell.*`, `picker.*`, `topic.<topic>.desc`. Опис рівнів — наявні `progress.junior|middle|senior` (їхні uk-значення дослівно збігаються з `LevelPicker`).

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"shell.nav.home": "Кабінет",
	"shell.nav.new": "Нова сесія",
	"shell.nav.history": "Історія",
	"shell.nav.progress": "Прогрес",
	"shell.profileMenu": "Меню профілю",
	"shell.logout": "Вийти",
	"shell.endSession": "Завершити сесію",
	"picker.topicAria": "Тема співбесіди",
	"picker.levelAria": "Рівень складності",
	"topic.react.desc": "Компоненти, хуки, рендер-цикл",
	"topic.javascript.desc": "Замикання, асинхронність, прототипи",
	"topic.nodejs.desc": "Event Loop, потоки, npm-екосистема",
	"topic.typescript.desc": "Типи, дженерики, строгість",
	"topic.nextjs.desc": "SSR/SSG, роутинг, серверні компоненти",
	"topic.css.desc": "Каскад, флекс/ґрід, специфічність",
	"topic.html.desc": "Семантика, доступність, форми",
	"topic.sql.desc": "Джойни, індекси, нормалізація",
	"topic.restapi.desc": "Ресурси, статус-коди, версіонування",
	"topic.system-design.desc": "Масштабування, компроміси, архітектура систем"
```
`en.json`:
```json
	"shell.nav.home": "Dashboard",
	"shell.nav.new": "New session",
	"shell.nav.history": "History",
	"shell.nav.progress": "Progress",
	"shell.profileMenu": "Profile menu",
	"shell.logout": "Log out",
	"shell.endSession": "End session",
	"picker.topicAria": "Interview topic",
	"picker.levelAria": "Difficulty level",
	"topic.react.desc": "Components, hooks, the render cycle",
	"topic.javascript.desc": "Closures, async, prototypes",
	"topic.nodejs.desc": "Event Loop, streams, the npm ecosystem",
	"topic.typescript.desc": "Types, generics, strictness",
	"topic.nextjs.desc": "SSR/SSG, routing, server components",
	"topic.css.desc": "Cascade, flex/grid, specificity",
	"topic.html.desc": "Semantics, accessibility, forms",
	"topic.sql.desc": "Joins, indexes, normalization",
	"topic.restapi.desc": "Resources, status codes, versioning",
	"topic.system-design.desc": "Scaling, trade-offs, system architecture"
```

- [ ] **Step 2: `AppShell.tsx`**

`NAV_ITEMS`: поле `label` → `labelKey`:
```tsx
const NAV_ITEMS = [
	{ to: '/home', labelKey: 'shell.nav.home', end: true },
	{ to: '/interview/new', labelKey: 'shell.nav.new', end: false },
	{ to: '/history', labelKey: 'shell.nav.history', end: false },
	{ to: '/progress', labelKey: 'shell.nav.progress', end: false },
];
```
У `MainNav` і `FocusBar` додати `const { t } = useTranslation();` (імпорт з `react-i18next`) і замінити: `{item.label}` → `{t(item.labelKey)}`; `aria-label="Меню профілю"` → `aria-label={t('shell.profileMenu')}`; `Вийти` → `{t('shell.logout')}`; `Завершити сесію` → `{t('shell.endSession')}`.

- [ ] **Step 3: `TopicPicker.tsx`** — прибрати `desc` з `TOPIC_META` (лишити `tag`), мапа стає:
```tsx
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
```
У місці, де виводиться `meta.desc` (Read файл), замінити на `t(\`topic.${topic}.desc\`)`; `aria-label="Тема співбесіди"` → `aria-label={t('picker.topicAria')}`; додати `useTranslation`.

- [ ] **Step 4: `LevelPicker.tsx`** — `LEVEL_META` лишає `name`, `color` і `descKey`:
```tsx
const LEVEL_META: Record<Level, { name: string; descKey: string; color: string }> = {
	junior: { name: 'Junior', descKey: 'progress.junior', color: 'var(--green)' },
	middle: { name: 'Middle', descKey: 'progress.middle', color: 'var(--amber)' },
	senior: { name: 'Senior', descKey: 'progress.senior', color: 'var(--plum)' },
};
```
`{meta.desc}` → `{t(meta.descKey)}`; `aria-label="Рівень складності"` → `aria-label={t('picker.levelAria')}`; додати `const { t } = useTranslation();` у `LevelPicker`.

- [ ] **Step 5: Перевірка + commit**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build` → зелене.
```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate AppShell and the topic/level pickers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task C2: Екран співбесіди (`NewSessionPage`, `InterviewSessionPage`, `AnswerForm`, `FeedbackCard`, `ReviewModal`, `SessionSummary`)

**Files:**
- Modify: ті шість файлів + `client/src/locales/{uk,en}.json`
- Test: `client/src/components/AnswerForm/AnswerForm.i18n.test.tsx`; доповнити `FeedbackCard.test.tsx`

**Interfaces:**
- Produces: ключі `new.*`, `session.*`, `answer.*`, `card.*` (доповнення), `modal.*`, `summary.*`.

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"new.eyebrow": "нова співбесіда",
	"new.title": "Обери тему та рівень складності",
	"new.error": "Не вдалося створити сесію. Спробуй ще раз.",
	"new.start": "Почати співбесіду →",
	"new.starting": "Створюємо сесію…",
	"session.notFound": "Сесія не знайдена — почни нову.",
	"session.unavailable": "Ця сесія недоступна — можливо, вона вже неактивна. Почни нову.",
	"session.new": "Нова сесія",
	"session.next": "Наступне питання →",
	"session.summary": "Переглянути підсумок →",
	"session.reviewError": "Не вдалося перевірити відповідь. Спробуй ще раз.",
	"session.endTitle": "Завершити сесію?",
	"session.endMessage": "Прогрес по поточному питанню не збережеться.",
	"session.endConfirm": "Завершити",
	"session.endCancel": "Продовжити",
	"answer.placeholder": "Введи свою відповідь…",
	"answer.chars_one": "{{count}} символ",
	"answer.chars_few": "{{count}} символи",
	"answer.chars_many": "{{count}} символів",
	"answer.chars_other": "{{count}} символу",
	"answer.skip": "Не знаю",
	"answer.submit": "Перевірити відповідь →",
	"answer.skipping": "AI reviewer готує відповідь на питання…",
	"answer.reviewing": "AI reviewer аналізує відповідь…",
	"card.title": "AI reviewer · рев'ю відповіді",
	"card.accuracy": "Точність: {{score}}/10",
	"card.skippedAnswer": "Ось відповідь на питання",
	"card.skippedNote": "Це питання не впливає на результат сесії — воно не враховується в середньому балі. Повернись до цієї теми пізніше.",
	"modal.close": "Закрити",
	"modal.skippedNote": "Це питання не вплинуло на результат сесії — воно не враховане в середньому балі.",
	"summary.average": "середній бал · {{topic}}/{{level}}",
	"summary.skipped": "пропущено",
	"summary.weak": "рекомендовано підтягнути:",
	"summary.again": "Ще одна сесія",
	"summary.home": "На головну"
```
`en.json`:
```json
	"new.eyebrow": "new interview",
	"new.title": "Pick a topic and difficulty level",
	"new.error": "Couldn't create the session. Try again.",
	"new.start": "Start interview →",
	"new.starting": "Creating session…",
	"session.notFound": "Session not found — start a new one.",
	"session.unavailable": "This session is unavailable — it may no longer be active. Start a new one.",
	"session.new": "New session",
	"session.next": "Next question →",
	"session.summary": "View summary →",
	"session.reviewError": "Couldn't check your answer. Try again.",
	"session.endTitle": "End the session?",
	"session.endMessage": "Progress on the current question won't be saved.",
	"session.endConfirm": "End",
	"session.endCancel": "Continue",
	"answer.placeholder": "Type your answer…",
	"answer.chars_one": "{{count}} character",
	"answer.chars_other": "{{count}} characters",
	"answer.skip": "I don't know",
	"answer.submit": "Check answer →",
	"answer.skipping": "The AI reviewer is preparing an answer…",
	"answer.reviewing": "The AI reviewer is analyzing your answer…",
	"card.title": "AI reviewer · answer review",
	"card.accuracy": "Accuracy: {{score}}/10",
	"card.skippedAnswer": "Here is the answer to the question",
	"card.skippedNote": "This question doesn't affect the session result — it isn't counted in the average score. Come back to this topic later.",
	"modal.close": "Close",
	"modal.skippedNote": "This question didn't affect the session result — it isn't counted in the average score.",
	"summary.average": "average score · {{topic}}/{{level}}",
	"summary.skipped": "skipped",
	"summary.weak": "recommended to review:",
	"summary.again": "One more session",
	"summary.home": "Back to home"
```

- [ ] **Step 2: Тест `AnswerForm` (падає)** — `client/src/components/AnswerForm/AnswerForm.i18n.test.tsx`

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { AnswerForm } from './AnswerForm';

function renderForm(length: number) {
	render(
		<AnswerForm value={'a'.repeat(length)} onChange={vi.fn()} onSubmit={vi.fn()} onSkip={vi.fn()} pending={false} />,
	);
}

describe('AnswerForm i18n', () => {
	afterEach(() => cleanup());

	it.each([
		[1, '1 символ'],
		[2, '2 символи'],
		[5, '5 символів'],
		[11, '11 символів'],
		[21, '21 символ'],
	])('uses the right Ukrainian plural for %i characters', (length, text) => {
		renderForm(length);

		expect(screen.getByText(text)).toBeInTheDocument();
	});

	it('renders English text and plural forms', async () => {
		await i18n.changeLanguage('en');
		renderForm(1);
		expect(screen.getByText('1 character')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: "I don't know" })).toBeInTheDocument();

		cleanup();
		renderForm(2);
		expect(screen.getByText('2 characters')).toBeInTheDocument();
	});
});
```
Додати в `FeedbackCard.test.tsx` тест англійської (імпорт `i18n` і `afterEach` за зразком файлу; використати ті самі props, що й існуючі тести цього файлу):
```tsx
	it('renders English labels', async () => {
		await i18n.changeLanguage('en');
		render(<FeedbackCard {...baseProps} />);

		expect(screen.getByText('Here is your answer')).toBeInTheDocument();
		expect(screen.getByText('A possible answer')).toBeInTheDocument();
		expect(screen.getByText(/Accuracy: 6\/10/)).toBeInTheDocument();
	});
```
(`baseProps` — назва константи props у цьому тесті; `Read` файл і підставити фактичну назву/спосіб рендеру.)
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/components/AnswerForm src/components/FeedbackCard` → FAIL.

- [ ] **Step 3: Заміни в коді**

`NewSessionPage.tsx` (додати `useTranslation`):
| Було | Стало |
|---|---|
| `<Eyebrow>нова співбесіда</Eyebrow>` | `<Eyebrow>{t('new.eyebrow')}</Eyebrow>` |
| `Обери тему та рівень складності` | `{t('new.title')}` |
| `Не вдалося створити сесію. Спробуй ще раз.` | `{t('new.error')}` |
| `{startSession.isPending ? 'Створюємо сесію…' : 'Почати співбесіду →'}` | `{startSession.isPending ? t('new.starting') : t('new.start')}` |

`AnswerForm.tsx`:
| Було | Стало |
|---|---|
| `placeholder="Введи свою відповідь…"` | `placeholder={t('answer.placeholder')}` |
| `{value.length} символів` | `{t('answer.chars', { count: value.length })}` |
| `Не знаю` (кнопка) | `{t('answer.skip')}` |
| `'Перевірити відповідь →'` | `t('answer.submit')` |
| `'AI reviewer готує відповідь на питання…'` / `'AI reviewer аналізує відповідь…'` | `t('answer.skipping')` / `t('answer.reviewing')` |

`FeedbackCard.tsx`:
| Було | Стало |
|---|---|
| `title={<>AI reviewer · рев'ю відповіді</>}` | `title={<>{t('card.title')}</>}` |
| `Точність: {score}/10` | `{t('card.accuracy', { score })}` |
| `label="Ось твоя відповідь"` | `label={t('card.userAnswer')}` |
| `skipped ? 'Ось відповідь на питання' : 'Можлива відповідь'` | `skipped ? t('card.skippedAnswer') : t('card.betterAnswer')` |
| довгий текст про «не впливає на результат» | `t('card.skippedNote')` |

`ReviewModal.tsx`:
| Було | Стало |
|---|---|
| `aria-label="Закрити"` | `aria-label={t('modal.close')}` |
| `Точність: {detail.data.averageScore.toFixed(1)}/10` | `{t('card.accuracy', { score: detail.data.averageScore.toFixed(1) })}` |
| `label="Ось твоя відповідь"` | `label={t('card.userAnswer')}` |
| `skipped ? 'Ось відповідь на питання' : 'Можлива відповідь'` | `skipped ? t('card.skippedAnswer') : t('card.betterAnswer')` |
| текст «не вплинуло на результат» | `t('modal.skippedNote')` |

`SessionSummary.tsx`:
| Було | Стало |
|---|---|
| `середній бал · {TOPIC_LABEL[topic]}/{level}` | `{t('summary.average', { topic: TOPIC_LABEL[topic], level })}` |
| `result.skipped ? 'пропущено' : …` | `result.skipped ? t('summary.skipped') : …` |
| `рекомендовано підтягнути:` | `{t('summary.weak')}` |
| `Ще одна сесія` / `На головну` | `{t('summary.again')}` / `{t('summary.home')}` |

`InterviewSessionPage.tsx`:
| Рядок | Було | Стало |
|---|---|---|
| 94 | `Сесія не знайдена — почни нову.` | `{t('session.notFound')}` |
| 96, 138 | `Нова сесія` | `{t('session.new')}` |
| 135 | `Ця сесія недоступна — …` | `{t('session.unavailable')}` |
| 227 | `{review.done ? 'Переглянути підсумок →' : 'Наступне питання →'}` | `{review.done ? t('session.summary') : t('session.next')}` |
| 234 | `Не вдалося перевірити відповідь. Спробуй ще раз.` | `{t('session.reviewError')}` |
| 239–242 | `title="Завершити сесію?"` `message="Прогрес по поточному питанню не збережеться."` `confirmLabel="Завершити"` `cancelLabel="Продовжити"` | `title={t('session.endTitle')}` `message={t('session.endMessage')}` `confirmLabel={t('session.endConfirm')}` `cancelLabel={t('session.endCancel')}` |

Хуки: `useTranslation()` викликати на верхньому рівні компонента перед ранніми `return` (у `InterviewSessionPage` є кілька гілок раннього повернення — `Read` файл і поставити виклик на початок функції).

- [ ] **Step 4: Запустити**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Expected: зелене (наявні тести з українським текстом проходять, бо `testSetup` ставить `uk`).

- [ ] **Step 5: Commit**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate the interview flow screens" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task C3: `HomePage`, `HistoryPage`, `HistoryTable`

**Files:**
- Modify: `client/src/pages/HomePage.tsx`, `client/src/pages/HistoryPage.tsx`, `client/src/components/HistoryTable/HistoryTable.tsx`, `client/src/locales/{uk,en}.json`

**Interfaces:**
- Produces: ключі `home.*`, `stats.*` (спільні з `ProgressPage`), `history.*`, `hist.colActions`, `hist.view`, `hist.empty`, `common.noneCompleted`.

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"common.noneCompleted": "Ще немає завершених сесій.",
	"stats.sessions": "сесій",
	"stats.accuracy": "точність",
	"stats.streak": "🔥 серія",
	"stats.streakDays_one": "{{count}} день",
	"stats.streakDays_few": "{{count}} дні",
	"stats.streakDays_many": "{{count}} днів",
	"stats.streakDays_other": "{{count}} дня",
	"stats.totalSessions": "сесій усього",
	"stats.strongTopic": "сильна тема",
	"home.title": "Кабінет",
	"home.level": "рівень: {{level}}",
	"home.resume": "продовжити з того, де зупинились",
	"home.resumeCta": "Продовжити тренування →",
	"home.chooseNew": "Обрати нову тему",
	"home.noActive": "немає активної сесії",
	"home.recent": "останні сесії",
	"home.historyLink": "Уся історія →",
	"home.historyDesc": "з фільтрами за темою й рівнем",
	"home.historyDescCount_one": "{{count}} пройдена співбесіда з фільтрами за темою й рівнем",
	"home.historyDescCount_few": "{{count}} пройдені співбесіди з фільтрами за темою й рівнем",
	"home.historyDescCount_many": "{{count}} пройдених співбесід з фільтрами за темою й рівнем",
	"home.historyDescCount_other": "{{count}} пройдені співбесіди з фільтрами за темою й рівнем",
	"home.statsLink": "Детальна статистика →",
	"home.statsDesc": "Графік активності, точність за темами, тренд і рекомендації",
	"history.title": "Історія проходжень",
	"history.subtitle": "Кожна сесія — окремий запис: тема, рівень, оцінка й статус. Натисни «переглянути», щоб побачити рев'ю відповіді.",
	"history.filterTopic": "тема:",
	"history.filterLevel": "рівень:",
	"history.all": "Усі",
	"hist.colActions": "Дії",
	"hist.view": "переглянути",
	"hist.empty": "Нічого не знайдено за цим фільтром. Спробуй інше поєднання теми й рівня."
```
`en.json`:
```json
	"common.noneCompleted": "No completed sessions yet.",
	"stats.sessions": "sessions",
	"stats.accuracy": "accuracy",
	"stats.streak": "🔥 streak",
	"stats.streakDays_one": "{{count}} day",
	"stats.streakDays_other": "{{count}} days",
	"stats.totalSessions": "total sessions",
	"stats.strongTopic": "strongest topic",
	"home.title": "Dashboard",
	"home.level": "level: {{level}}",
	"home.resume": "pick up where you left off",
	"home.resumeCta": "Continue training →",
	"home.chooseNew": "Pick a new topic",
	"home.noActive": "no active session",
	"home.recent": "recent sessions",
	"home.historyLink": "All history →",
	"home.historyDesc": "filterable by topic and level",
	"home.historyDescCount_one": "{{count}} completed interview, filterable by topic and level",
	"home.historyDescCount_other": "{{count}} completed interviews, filterable by topic and level",
	"home.statsLink": "Detailed statistics →",
	"home.statsDesc": "Activity graph, accuracy by topic, trend and recommendations",
	"history.title": "Interview history",
	"history.subtitle": "Every session is its own entry: topic, level, score and status. Click “view” to see the answer review.",
	"history.filterTopic": "topic:",
	"history.filterLevel": "level:",
	"history.all": "All",
	"hist.colActions": "Actions",
	"hist.view": "view",
	"hist.empty": "Nothing found for this filter. Try a different topic and level combination."
```
Ключ `new.start` (C2) перевикористовується в `HomePage` для «Почати співбесіду →».

- [ ] **Step 2: `HomePage.tsx`** (додати `useTranslation`)

| Рядок | Було | Стало |
|---|---|---|
| 38 | `Кабінет` | `{t('home.title')}` |
| 52 | `рівень: {LEVEL_LABEL[typicalLevel]}` | `{t('home.level', { level: LEVEL_LABEL[typicalLevel] })}` |
| 55 | `Вийти` | `{t('shell.logout')}` |
| 62 | `label="сесій"` | `label={t('stats.sessions')}` |
| 66 | `label="точність"` | `label={t('stats.accuracy')}` |
| 71–72 | `label="🔥 серія"` і `{streakDays} {streakDays === 1 ? 'день' : 'днів'}` | `label={t('stats.streak')}` і `{t('stats.streakDays', { count: stats.data.streakDays })}` |
| 75 | `label="сильна тема"` | `label={t('stats.strongTopic')}` |
| 81 | `продовжити з того, де зупинились` | `{t('home.resume')}` |
| 106 | `Продовжити тренування →` | `{t('home.resumeCta')}` |
| 109 | `Обрати нову тему` | `{t('home.chooseNew')}` |
| 116 | `немає активної сесії` | `{t('home.noActive')}` |
| 119 | `Почати співбесіду →` | `{t('new.start')}` |
| 127 | `останні сесії` | `{t('home.recent')}` |
| 131 | `Ще немає завершених сесій.` | `{t('common.noneCompleted')}` |
| 160 | `Уся історія →` | `{t('home.historyLink')}` |
| 162–163 | `{stats.data ? \`${…} пройдених співбесід \` : ''}з фільтрами за темою й рівнем` | `{stats.data ? t('home.historyDescCount', { count: stats.data.totalSessions }) : t('home.historyDesc')}` |
| 167 | `Детальна статистика →` | `{t('home.statsLink')}` |
| 169 | `Графік активності, точність …` | `{t('home.statsDesc')}` |

- [ ] **Step 3: `HistoryPage.tsx`**

| Рядок | Було | Стало |
|---|---|---|
| 20 | `Історія проходжень` | `{t('history.title')}` |
| 22–23 | `Кожна сесія — … рев'ю відповіді.` | `{t('history.subtitle')}` |
| 29 | `тема:` | `{t('history.filterTopic')}` |
| 35, 57 | `Усі` | `{t('history.all')}` |
| 49 | `рівень:` | `{t('history.filterLevel')}` |

- [ ] **Step 4: `HistoryTable.tsx`** (додати `useTranslation`; `formatCompletedAt` вже бере мову сама)

| Рядок | Було | Стало |
|---|---|---|
| 15 | `Нічого не знайдено за цим фільтром. …` | `{t('hist.empty')}` |
| 23–28 | `<th>Тема</th>` … `<th>Дії</th>` | `<th>{t('hist.colTopic')}</th>` `<th>{t('hist.colLevel')}</th>` `<th>{t('hist.colDate')}</th>` `<th>{t('hist.colScore')}</th>` `<th>{t('hist.colStatus')}</th>` `<th>{t('hist.colActions')}</th>` |
| 36, 39, 40, 41, 44, 51 | `data-label="Тема"` / `"Рівень"` / `"Дата"` / `"Оцінка"` / `"Статус"` / `"Дії"` | `data-label={t('hist.colTopic')}` / `colLevel` / `colDate` / `colScore` / `colStatus` / `colActions` |
| 48 | `{passed ? 'схвалено' : 'повторити'}` | `{passed ? t('hist.pass') : t('hist.retry')}` |
| 53 | `переглянути` | `{t('hist.view')}` |

- [ ] **Step 5: Перевірка + commit**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build` → зелене.
```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate the dashboard and history screens" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task C4: `ProgressPage` і `Heatmap`

**Files:**
- Modify: `client/src/pages/ProgressPage.tsx`, `client/src/components/Heatmap/Heatmap.tsx`, `client/src/locales/{uk,en}.json`

**Interfaces:**
- Consumes: `stats.*`, `common.noneCompleted`, `common.tagline`, `progress.count|less|more`, `heat.none`.

- [ ] **Step 1: Ключі** — додати в кінець обох JSON

`uk.json`:
```json
	"stats.h1": "Детальна статистика",
	"stats.subtitle": "Мова конкретна: скільки питань, яка точність і де саме прогалини — щоб знати, що повторити перед співбесідою.",
	"stats.byTopic": "точність за темами",
	"stats.noTopics": "Ще немає даних по темах.",
	"stats.trendTitle": "тренд точності — останні {{count}} сесій",
	"stats.noTrend": "Недостатньо даних для тренду.",
	"stats.recommend": "рекомендовано підтягнути",
	"stats.recAttempts_one": "{{topic}} — {{pct}}% точності, {{count}} спроба",
	"stats.recAttempts_few": "{{topic}} — {{pct}}% точності, {{count}} спроби",
	"stats.recAttempts_many": "{{topic}} — {{pct}}% точності, {{count}} спроб",
	"stats.recAttempts_other": "{{topic}} — {{pct}}% точності, {{count}} спроби",
	"stats.recNote": "Точність нижче цільової — варто приділити цій темі більше уваги перед наступною співбесідою.",
	"stats.levels": "розподіл за рівнем складності",
	"stats.trendAria": "Тренд точності: {{first}}% → {{last}}%",
	"stats.trendAgo_one": "{{count}} сесія тому · {{pct}}%",
	"stats.trendAgo_few": "{{count}} сесії тому · {{pct}}%",
	"stats.trendAgo_many": "{{count}} сесій тому · {{pct}}%",
	"stats.trendAgo_other": "{{count}} сесії тому · {{pct}}%",
	"stats.today": "сьогодні · {{pct}}%",
	"heat.sessions_one": "{{count}} сесія",
	"heat.sessions_few": "{{count}} сесії",
	"heat.sessions_many": "{{count}} сесій",
	"heat.sessions_other": "{{count}} сесії"
```
`en.json`:
```json
	"stats.h1": "Detailed statistics",
	"stats.subtitle": "The language is specific: how many questions, what accuracy and exactly where the gaps are — so you know what to review before the interview.",
	"stats.byTopic": "accuracy by topic",
	"stats.noTopics": "No topic data yet.",
	"stats.trendTitle": "accuracy trend — last {{count}} sessions",
	"stats.noTrend": "Not enough data for a trend.",
	"stats.recommend": "recommended to review",
	"stats.recAttempts_one": "{{topic}} — {{pct}}% accuracy, {{count}} attempt",
	"stats.recAttempts_other": "{{topic}} — {{pct}}% accuracy, {{count}} attempts",
	"stats.recNote": "Accuracy is below target — this topic deserves more attention before your next interview.",
	"stats.levels": "distribution by difficulty level",
	"stats.trendAria": "Accuracy trend: {{first}}% → {{last}}%",
	"stats.trendAgo_one": "{{count}} session ago · {{pct}}%",
	"stats.trendAgo_other": "{{count}} sessions ago · {{pct}}%",
	"stats.today": "today · {{pct}}%",
	"heat.sessions_one": "{{count}} session",
	"heat.sessions_other": "{{count}} sessions"
```
(`TREND_SIZE` — константа в `ProgressPage.tsx`; якщо її значення може бути <5, додати плюральні форми `stats.trendTitle_*` за зразком `stats.trendAgo_*`.)

- [ ] **Step 2: `ProgressPage.tsx`** — додати `useTranslation` у `ProgressPage` **і** у внутрішній компонент тренд-графіка (рядки ~190–211)

| Рядок | Було | Стало |
|---|---|---|
| 53 | `Детальна статистика` | `{t('stats.h1')}` |
| 55–56 | `Мова конкретна: …` | `{t('stats.subtitle')}` |
| 63 | `label="точність"` | `label={t('stats.accuracy')}` |
| 68–69 | `label="🔥 серія"` + `{days} {days === 1 ? 'день' : 'днів'}` | `label={t('stats.streak')}` + `{t('stats.streakDays', { count: stats.data.streakDays })}` |
| 72 | `label="сесій усього"` | `label={t('stats.totalSessions')}` |
| 74 | `label="сильна тема"` | `label={t('stats.strongTopic')}` |
| 85 | `точність за темами` | `{t('stats.byTopic')}` |
| 100 | `Ще немає даних по темах.` | `{t('stats.noTopics')}` |
| 105 | `тренд точності — останні {TREND_SIZE} сесій` | `{t('stats.trendTitle', { count: TREND_SIZE })}` |
| 109 | `Недостатньо даних для тренду.` | `{t('stats.noTrend')}` |
| 116 | `рекомендовано підтягнути` | `{t('stats.recommend')}` |
| 126–127 | `{TOPIC_LABEL[rec.topic]} — {pct}% точності, {rec.count} {…'спроба' : 'спроб'}` | `{t('stats.recAttempts', { topic: TOPIC_LABEL[rec.topic], pct: Math.round(rec.accuracy * 100), count: rec.count })}` |
| 130–131 | `Точність нижче цільової — …` | `{t('stats.recNote')}` |
| 140 | `розподіл за рівнем складності` | `{t('stats.levels')}` |
| 166 | `Ще немає завершених сесій.` | `{t('common.noneCompleted')}` |
| 170 | `diff — порівняй. виправ. пройди.` | `{t('common.tagline')}` |
| 197 | `` aria-label={`Тренд точності: ${firstPct}% → ${lastPct}%`} `` | `aria-label={t('stats.trendAria', { first: firstPct, last: lastPct })}` |
| 210 | `<span>{sessions.length} сесій тому · {firstPct}%</span>` | `<span>{t('stats.trendAgo', { count: sessions.length, pct: firstPct })}</span>` |
| 211 | `<span>сьогодні · {lastPct}%</span>` | `<span>{t('stats.today', { pct: lastPct })}</span>` |

- [ ] **Step 3: `Heatmap.tsx`** (`useTranslation` вже підключено в A3 — перейти з `const { i18n }` на `const { t, i18n }`)

| Було | Стало |
|---|---|
| `<b>{completedDates.length}</b> співбесід за останні 12 місяців` | `<b>{completedDates.length}</b> {t('progress.count')}` |
| `менше` / `більше` | `{t('progress.less')}` / `{t('progress.more')}` |
| `title={cell.count === 0 ? 'Немає сесій' : \`${cell.count} сесій\`}` | `title={cell.count === 0 ? t('heat.none') : t('heat.sessions', { count: cell.count })}` |

- [ ] **Step 4: Перевірка + commit**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build` → зелене.
```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): translate the progress screen and heatmap" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task C5: Українські множини і гвардія від хардкоду

**Files:**
- Modify: `client/src/locales/locales.test.ts`
- Create: `client/src/noHardcodedCyrillic.test.ts`

- [ ] **Step 1: Тест множин** — додати в `locales.test.ts` (імпорт `i18n from '../i18n'` угорі)

```ts
describe('Ukrainian plurals', () => {
	it.each([
		[1, '1 день'],
		[2, '2 дні'],
		[5, '5 днів'],
		[11, '11 днів'],
		[21, '21 день'],
		[22, '22 дні'],
	])('stats.streakDays for %i', (count, expected) => {
		expect(i18n.t('stats.streakDays', { count, lng: 'uk' })).toBe(expected);
	});

	it('uses singular/plural in English', () => {
		expect(i18n.t('stats.streakDays', { count: 1, lng: 'en' })).toBe('1 day');
		expect(i18n.t('stats.streakDays', { count: 2, lng: 'en' })).toBe('2 days');
	});
});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/locales` → PASS (ключі додані в C3). Якщо `22 дні` падає — перевірити, що в `uk.json` є всі чотири суфікси `_one/_few/_many/_other`.

- [ ] **Step 2: Гвардія від хардкоду** — `client/src/noHardcodedCyrillic.test.ts`

```ts
import { describe, expect, it } from 'vitest';

// Best-effort guard: source files (not tests, not the dev showcase App.tsx) must not contain
// Cyrillic outside comments — user-facing text belongs in locales/*.json.
const files = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}', '!./App.tsx'], {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;

const CYRILLIC = /[Ѐ-ӿ]/;

function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ''))
		.replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('no hardcoded Cyrillic in client source', () => {
	it('keeps user-facing text in the locale files', () => {
		const offenders = Object.entries(files).flatMap(([path, source]) =>
			stripComments(source)
				.split('\n')
				.map((text, index) => ({ path, line: index + 1, text }))
				.filter(({ text }) => CYRILLIC.test(text))
				.map(({ path, line, text }) => `${path}:${line}: ${text.trim()}`),
		);

		expect(offenders).toEqual([]);
	});
});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/noHardcodedCyrillic.test.ts`
Expected: PASS. Якщо знайдено залишки — перенести кожен у ключі за зразком C1–C4 (типові: `Badge`, `Reveal`, `Eyebrow` — зазвичай коментарі, що не мають спрацювати; реальний рядок = пропущений хардкод). Обмеження: JSX-текст, що починається з `//` (як `// Q:`), стрип сприймає за коментар — такі місця перевірені вручну в Task B1.

- [ ] **Step 3: Повна перевірка**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build` → зелене.
Вручну (без живого Mongo): `npm run dev`, `/` і `/login` у обох мовах; захищені сторінки перевірити неможливо без Mongo — зазначити це в PR.

- [ ] **Step 4: Commit, push, чернетка PR**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "test(client): pin Ukrainian plurals and guard against hardcoded Cyrillic" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" && git pull --ff-only origin main && git push -u origin feat/i18n-app-pages
gh pr create --draft --base main --head feat/i18n-app-pages --title "feat(client): translate the authenticated app screens" --body "$(cat <<'EOF'
## What changed
- `AppShell`, pickers, interview flow (`NewSessionPage`, `InterviewSessionPage`, `AnswerForm`, `FeedbackCard`, `ReviewModal`, `SessionSummary`), `HomePage`, `HistoryPage`/`HistoryTable`, `ProgressPage`, `Heatmap` read all text from the locale files.
- Counts use i18next plural forms («1 день / 2 дні / 5 днів»; previously «2 днів»).
- Guard test fails if Cyrillic reappears in client source outside comments/tests/`App.tsx`.

## Why
Part 3 of 4 of the full i18n (spec: `docs/superpowers/specs/2026-10-04-i18n-completion-design.md`).

## How to check
- `cd client && npx vitest run && npm run lint && npm run build`
- Not verified against a live Mongo: screens behind auth were checked only through tests/build. Please click through Home, History, Progress and an interview in both languages.

## Related issues
None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Part D — мова ШІ (`feat/ai-session-language`)

Починати після мерджу Part C: `git checkout main && git pull --ff-only origin main && git checkout -b feat/ai-session-language`.

### Task D1: Схема й тип `Lang` на сервері

**Files:**
- Modify: `src/models/InterviewSession.ts`
- Modify: `client/src/types/interview.ts`

**Interfaces:**
- Produces (server): `LANGS = ['uk', 'en'] as const`, `type Lang`; поле `InterviewSession.lang?: 'uk' | 'en'`.
- Produces (client): `LANGS`, `type Lang`, `StartSessionRequest.lang?: Lang`.

- [ ] **Step 1: Сервер** — `src/models/InterviewSession.ts`: після `LEVELS` (рядок 4) додати
```ts
export const LANGS = ['uk', 'en'] as const;
export type Lang = (typeof LANGS)[number];
```
У `interviewSessionSchema` після рядка `level` додати (без `default:` — це бізнес-рішення, воно в контролері):
```ts
		// Мова ШІ-відповідей сесії. Optional: документи, створені до цієї зміни, її не мають — код
		// читає це як 'uk'.
		lang: { type: String, enum: LANGS },
```

- [ ] **Step 2: Клієнт** — `client/src/types/interview.ts`: після `LEVELS`/`Level` додати
```ts
export const LANGS = ['uk', 'en'] as const;
export type Lang = (typeof LANGS)[number];
```
і в `StartSessionRequest` додати `lang?: Lang;`.

- [ ] **Step 3: Збірка/lint обох сторін**

Run: `cd /d/AI-interview-trainer && npm run build && npm run lint && cd client && npm run build`
Expected: зелене. (Хук `check_enums.py` при коміті перевіряє `TOPICS`/`LEVELS`; якщо він узагальнений і вимагає синхронності `LANGS` — він це покаже.)

- [ ] **Step 4: Commit**

```bash
cd /d/AI-interview-trainer && git add src/models/InterviewSession.ts client/src/types/interview.ts && git commit -m "feat(server): add an optional lang to InterviewSession" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task D2: `ai.service` приймає мову

**Files:**
- Modify: `src/services/ai.service.ts`
- Test: `src/services/ai.service.answerQuestion.test.ts` (оновити виклики), створити `src/services/ai.service.lang.test.ts`

**Interfaces:**
- Consumes: `Lang` (D1).
- Produces: `generateQuestion(topic, level, askedQuestions, lang: Lang)`, `answerQuestion(topic, level, question, lang: Lang)`, `reviewAnswer(topic, level, question, answer, lang: Lang)` — `lang` **обов'язковий** (єдиний дефолт `'uk'` живе в контролері).

- [ ] **Step 1: Тест (падає)** — `src/services/ai.service.lang.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create };
	},
}));

const { generateQuestion, answerQuestion, reviewAnswer } = await import('./ai.service.js');

const reviewJson = JSON.stringify({ score: 5, feedback: 'f', correctAnswer: 'c', weakTopics: [] });

describe('AI session language', () => {
	beforeEach(() => {
		process.env.ANTHROPIC_API_KEY = 'test-key';
		create.mockReset();
	});

	it.each([
		['uk', 'Ukrainian'],
		['en', 'English'],
	] as const)('generateQuestion asks for %s', async (lang, name) => {
		create.mockResolvedValue({ content: [{ type: 'text', text: 'q?' }] });

		await generateQuestion('react', 'junior', [], lang);

		expect(create.mock.calls[0][0].system).toContain(`Write your entire response in ${name}.`);
	});

	it('answerQuestion asks for the session language', async () => {
		create.mockResolvedValue({ content: [{ type: 'text', text: 'a' }] });

		await answerQuestion('react', 'junior', 'What is X?', 'en');

		expect(create.mock.calls[0][0].system).toContain('Write your entire response in English.');
	});

	it('reviewAnswer asks for the session language while keeping the JSON keys', async () => {
		create.mockResolvedValue({ content: [{ type: 'text', text: reviewJson }] });

		await reviewAnswer('react', 'junior', 'What is X?', 'my answer', 'en');

		const system: string = create.mock.calls[0][0].system;
		expect(system).toContain('Write your entire response in English.');
		expect(system).toContain('"score"');
		expect(system).toContain('JSON keys must stay exactly as specified');
	});
});
```
Run: `cd /d/AI-interview-trainer && npx vitest run src/services/ai.service.lang.test.ts` → FAIL.

- [ ] **Step 2: Реалізація** — `src/services/ai.service.ts`

Додати імпорт і хелпер після `getClient`:
```ts
import type { Lang } from '../models/InterviewSession.js';

const LANGUAGE_NAME: Record<Lang, string> = { uk: 'Ukrainian', en: 'English' };

function languageInstruction(lang: Lang): string {
	return ` Write your entire response in ${LANGUAGE_NAME[lang]}.`;
}
```
Змінити сигнатури й `system`:
- `generateQuestion(topic, level, askedQuestions, lang: Lang)`: у кінець `system` (після `'Такий підхід використовуй для будь-якої теми'`) додати `+ languageInstruction(lang)`.
- `answerQuestion(topic, level, question, lang: Lang)`: у кінець `system` додати `+ languageInstruction(lang)`.
- `reviewAnswer(topic, level, question, answer, lang: Lang)`: у кінець `system` додати `+ languageInstruction(lang) + ' JSON keys must stay exactly as specified.'`.

Користувацькі повідомлення (`Тема: … Рівень: …`) не чіпати — наявні тести на них лишаються.

- [ ] **Step 3: Оновити наявні виклики й типи**

`src/services/ai.service.answerQuestion.test.ts`: у двох викликах додати четвертий аргумент `'uk'`: `answerQuestion('react', 'junior', 'What is a hook?', 'uk')`.
Run: `cd /d/AI-interview-trainer && npx tsc --noEmit` — компілятор покаже всі решту місць (тести/контролер), що викликають три функції без `lang`; тести виправити додаванням `'uk'`; контролер — у Task D3.

- [ ] **Step 4: Запустити тести сервісу**

Run: `cd /d/AI-interview-trainer && npx vitest run src/services`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /d/AI-interview-trainer && git add -A src && git commit -m "feat(server): make the AI prompts language-aware" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(Якщо `tsc` ще падає на контролері — закомітити разом із D3; не лишати зламану збірку в окремому коміті гілки.)

### Task D3: Контролер: валідація `lang`, збереження, використання з сесії

**Files:**
- Modify: `src/controllers/interview.controller.ts`
- Test: `src/controllers/interview.controller.test.ts` (мок моделі + нові тести)

**Interfaces:**
- Consumes: `LANGS`, `Lang` (D1); AI-функції з `lang` (D2).
- Produces: `POST /api/interview/start` приймає `lang`; `submitAnswer`/`getActiveSession` читають `session.lang ?? 'uk'`.

- [ ] **Step 1: Підготувати тестовий файл**

У `interview.controller.test.ts`:
- мок моделі (рядки 31–35) → додати `LANGS`: 
```ts
vi.mock('../models/InterviewSession.js', () => ({
	InterviewSessionModel: { findOne, create },
	TOPICS: ['react'],
	LEVELS: ['junior'],
	LANGS: ['uk', 'en'],
}));
```
і додати `create: vi.fn()` у `vi.hoisted`-об'єкт (`const { findOne, create, reviewAnswer, answerQuestion, generateQuestion } = vi.hoisted(...)`);
- імпорт: `const { submitAnswer, startSession, getActiveSession } = await import('./interview.controller.js');`
- `FakeSession` отримує `lang?: 'uk' | 'en';`, `makeSession(questions = [], lang?: 'uk' | 'en')` повертає й `lang`.
- Наявні `toHaveBeenCalledWith` на `answerQuestion`/`reviewAnswer`/`generateQuestion` (наприклад рядок 85) отримують четвертий/п'ятий аргумент `'uk'`: `answerQuestion` → `('react', 'junior', 'What is X?', 'uk')`. Запустити тести й виправити кожне падіння так само.

- [ ] **Step 2: Нові тести (падають)** — додати в кінець файлу

```ts
function mockRes() {
	return { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() };
}

describe('startSession — lang', () => {
	beforeEach(() => {
		create.mockReset().mockResolvedValue({ id: 's1' });
		generateQuestion.mockReset().mockResolvedValue({ question: 'first?' });
	});

	async function start(body: Record<string, unknown>) {
		const res = mockRes();
		await startSession({ body, userId: 'u1' } as unknown as AuthedRequest, res as unknown as Response);
		return res;
	}

	it('stores the requested language on the session and generates the question in it', async () => {
		await start({ topic: 'react', level: 'junior', lang: 'en' });

		expect(create).toHaveBeenCalledWith(expect.objectContaining({ lang: 'en' }));
		expect(generateQuestion).toHaveBeenCalledWith('react', 'junior', [], 'en');
	});

	it('defaults to Ukrainian when lang is omitted', async () => {
		await start({ topic: 'react', level: 'junior' });

		expect(create).toHaveBeenCalledWith(expect.objectContaining({ lang: 'uk' }));
		expect(generateQuestion).toHaveBeenCalledWith('react', 'junior', [], 'uk');
	});

	it.each(['fr', null, 1, ''])('rejects lang=%s with 400 and creates nothing', async (lang) => {
		const res = await start({ topic: 'react', level: 'junior', lang });

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ error: 'lang must be one of: uk, en' });
		expect(create).not.toHaveBeenCalled();
		expect(generateQuestion).not.toHaveBeenCalled();
	});
});

describe('session language is read from the session, not the request', () => {
	beforeEach(() => {
		findOne.mockReset();
		reviewAnswer.mockReset().mockResolvedValue({ score: 7, feedback: 'f', correctAnswer: 'c', weakTopics: [] });
		answerQuestion.mockReset().mockResolvedValue('model answer');
		generateQuestion.mockReset().mockResolvedValue({ question: 'next?' });
	});

	it('submitAnswer uses session.lang for the review and the next question', async () => {
		findOne.mockResolvedValue(makeSession([], 'en'));

		await submit('my answer');

		expect(reviewAnswer).toHaveBeenCalledWith('react', 'junior', 'What is X?', 'my answer', 'en');
		expect(generateQuestion).toHaveBeenCalledWith('react', 'junior', ['What is X?'], 'en');
	});

	it('submitAnswer treats a legacy session without lang as Ukrainian', async () => {
		findOne.mockResolvedValue(makeSession([], undefined));

		await submit('my answer');

		expect(reviewAnswer).toHaveBeenCalledWith('react', 'junior', 'What is X?', 'my answer', 'uk');
	});

	it('getActiveSession regenerates the question in the session language (uk for legacy sessions)', async () => {
		findOne.mockReturnValue({ sort: vi.fn().mockResolvedValue({ ...makeSession([], 'en'), id: 's1' }) });
		await getActiveSession({ userId: 'u1' } as unknown as AuthedRequest, mockRes() as unknown as Response);
		expect(generateQuestion).toHaveBeenLastCalledWith('react', 'junior', [], 'en');

		findOne.mockReturnValue({ sort: vi.fn().mockResolvedValue({ ...makeSession([], undefined), id: 's2' }) });
		await getActiveSession({ userId: 'u1' } as unknown as AuthedRequest, mockRes() as unknown as Response);
		expect(generateQuestion).toHaveBeenLastCalledWith('react', 'junior', [], 'uk');
	});
});
```
Run: `cd /d/AI-interview-trainer && npx vitest run src/controllers/interview.controller.test.ts` → FAIL.

- [ ] **Step 3: Реалізація** — `src/controllers/interview.controller.ts`

Імпорти:
```ts
import { InterviewSessionModel, LANGS, LEVELS, TOPICS } from '../models/InterviewSession.js';
import type { Lang } from '../models/InterviewSession.js';
```
Після `QUESTIONS_PER_SESSION` додати:
```ts
const DEFAULT_LANG: Lang = 'uk';
```
`startSession`:
```ts
	const { topic, level, lang } = req.body as { topic?: string; level?: string; lang?: unknown };
	// ... перевірки topic/level без змін ...
	if (lang !== undefined && !LANGS.includes(lang as Lang)) {
		res.status(400).json({ error: `lang must be one of: ${LANGS.join(', ')}` });
		return;
	}
	const sessionLang: Lang = (lang as Lang | undefined) ?? DEFAULT_LANG;

	const [session, { question }] = await Promise.all([
		InterviewSessionModel.create({ userId: req.userId, topic, level, lang: sessionLang, questions: [] }),
		generateQuestion(topic, level, [], sessionLang),
	]);
```
`getActiveSession`:
```ts
	const { question } = await generateQuestion(
		session.topic,
		session.level,
		askedQuestions,
		session.lang ?? DEFAULT_LANG,
	);
```
`submitAnswer` (після `const storedAnswer…`):
```ts
	const lang: Lang = session.lang ?? DEFAULT_LANG;
```
і виклики: `answerQuestion(session.topic, session.level, question, lang)`, `reviewAnswer(session.topic, session.level, question, answer, lang)`, `generateQuestion(session.topic, session.level, askedQuestions, lang)`.

- [ ] **Step 4: Запустити весь серверний набір, lint, збірку**

Run: `cd /d/AI-interview-trainer && npx vitest run && npm run lint && npm run build`
Expected: зелене.

- [ ] **Step 5: Commit**

```bash
cd /d/AI-interview-trainer && git add -A src && git commit -m "feat(server): fix the AI language when a session starts" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task D4: Клієнт передає мову при старті сесії

**Files:**
- Modify: `client/src/pages/NewSessionPage.tsx`
- Test: `client/src/pages/NewSessionPage.test.tsx`

**Interfaces:**
- Consumes: `currentLang()` (A1), `StartSessionRequest.lang` (D1).

- [ ] **Step 1: Тест (падає)** — `client/src/pages/NewSessionPage.test.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';

const { startInterviewSession } = vi.hoisted(() => ({ startInterviewSession: vi.fn() }));
vi.mock('../api/interview', () => ({ startInterviewSession }));

const { NewSessionPage } = await import('./NewSessionPage');

async function startFirstTopicAndLevel() {
	const user = userEvent.setup();
	render(
		<QueryClientProvider client={new QueryClient()}>
			<MemoryRouter>
				<NewSessionPage />
			</MemoryRouter>
		</QueryClientProvider>,
	);
	const [topics, levels] = screen.getAllByRole('radiogroup');
	await user.click(within(topics).getAllByRole('radio')[0]);
	await user.click(within(levels).getAllByRole('radio')[0]);
	await user.click(screen.getByRole('button', { name: /→$/ }));
}

describe('NewSessionPage language', () => {
	afterEach(() => {
		cleanup();
		startInterviewSession.mockReset();
	});

	it.each(['uk', 'en'])('starts the session with the active UI language (%s)', async (lang) => {
		startInterviewSession.mockResolvedValue({ sessionId: 's1', questionIndex: 0, totalQuestions: 5, question: 'q?' });
		await i18n.changeLanguage(lang);

		await startFirstTopicAndLevel();

		expect(startInterviewSession.mock.calls[0][0]).toEqual(expect.objectContaining({ lang }));
	});

	it('does not restart or re-request anything when the UI language changes mid-session', async () => {
		startInterviewSession.mockResolvedValue({ sessionId: 's1', questionIndex: 0, totalQuestions: 5, question: 'q?' });
		await startFirstTopicAndLevel();
		await i18n.changeLanguage('en');

		expect(startInterviewSession).toHaveBeenCalledTimes(1);
	});
});
```
Run: `cd /d/AI-interview-trainer/client && npx vitest run src/pages/NewSessionPage.test.tsx` → FAIL (`lang` не передається).

- [ ] **Step 2: Реалізація** — `NewSessionPage.tsx`: `import { currentLang } from '../i18n';`, у `handleStart`:
```tsx
			startSession.mutate(
				{ topic, level, lang: currentLang() },
```
Мова беремо в момент натискання «Почати»: далі сесія тримає її на сервері (`session.lang`), перемикання мови інтерфейсу її не змінює.

- [ ] **Step 3: Запустити клієнт**

Run: `cd /d/AI-interview-trainer/client && npx vitest run && npm run lint && npm run build`
Expected: зелене. Якщо `getAllByRole('radiogroup')` не знаходить групу тем — `Read` `TopicPicker.tsx` і підставити фактичні ролі/імена, не послаблюючи перевірку `lang`.

- [ ] **Step 4: Commit**

```bash
cd /d/AI-interview-trainer && git add -A client/src && git commit -m "feat(client): start sessions in the active UI language" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task D5: Документація, запис у data-model, OpenAPI, PR

**Files:**
- Modify: `docs/data-model.md`, `docs/features/interview-flow/openapi.yaml`, `.claude/rules/backend/interview-flow.md`, `.claude/rules/backend/data-model.md`, `.claude/rules/frontend/overview.md`, `docs/CONTEXT.md`, `docs/sad.md:373`, `docs/PRD.md:198`, `PROGRESS.md`, `docs/CHANGELOG.md`

- [ ] **Step 1: Schema-change log** — у `docs/data-model.md` перед `## Test fixtures` додати

```markdown
### 2026-10-04 — add optional `lang` to `InterviewSession`

- **Change:** added `lang: { type: String, enum: LANGS }` (`LANGS = ['uk', 'en']`) to
  `interviewSessionSchema` in `src/models/InterviewSession.ts` (and the mirrored `LANGS` in
  `client/src/types/interview.ts`). It records the language the AI uses for the whole session
  (questions, feedback, model answer). No schema `default:` — choosing `'uk'` for a missing value is
  a business decision, so `interview.controller.ts` applies it (`session.lang ?? 'uk'`).
- **Backfill:** none needed — sessions created before this change have no `lang` and are read as
  `'uk'`, which is the language they were created in.
- **Rollback:** remove the `lang` field from the schema and the `lang` handling from
  `interview.controller.ts` / `ai.service.ts`, then redeploy. Stored `lang` values in existing
  documents are ignored by Mongoose once the field is gone, so no data cleanup is required; sessions
  started in English will simply resume in the default language.
```

- [ ] **Step 2: OpenAPI** — `docs/features/interview-flow/openapi.yaml`: у `StartSessionRequest` (після `level`) додати
```yaml
        lang:
          type: string
          enum: [uk, en]
          description: Language of AI questions, feedback and model answers for this session. Defaults to `uk`.
```
і змінити опис відповіді `'400'` на `Invalid topic, level or lang.`

- [ ] **Step 3: Правила й документи**

| Файл | Зміна |
|---|---|
| `.claude/rules/backend/interview-flow.md` | Додати пункт: `POST /start` приймає `lang` (`uk`/`en`, невалідне → 400), зберігається в `InterviewSession.lang`; `submitAnswer`/`getActiveSession` беруть `session.lang ?? 'uk'`; усі три AI-функції отримують `lang` |
| `.claude/rules/backend/data-model.md` | Додати `lang` у перелік полів `InterviewSession` + нагадування синхронізувати `LANGS` з `client/src/types/interview.ts` |
| `.claude/rules/frontend/overview.md` | Замінити абзац «i18n is live … Currently only `LandingPage.tsx` uses `useTranslation()`» на опис: усі сторінки/компоненти читають `t()`, мова визначається в `i18n.ts` (`detectInitialLang`/`setLanguage`/`currentLang`), гвардія `noHardcodedCyrillic.test.ts`, `App.tsx` — виняток |
| `docs/CONTEXT.md` | `fix-term`-стиль запис у `## Glossary`: **мова сесії** — мова, якою ШІ веде одну сесію; фіксується при старті (`InterviewSession.lang`); НЕ мова інтерфейсу, яку можна міняти будь-коли |
| `docs/sad.md:373` | Прибрати «the landing-page language toggle is unfinished»; вказати, що i18n покриває весь клієнт, а мова ШІ зберігається в сесії |
| `docs/PRD.md:198` | `- [ ]` → `- [x]` для перемикача мови (мобільний nav-toggle лишається окремим пунктом — перед правкою `Read` рядок і розділити його, не відмічаючи те, що не зроблено) |
| `PROGRESS.md` | Додати запис: i18n завершено (A–D), що перевірено тестами, що не перевірено (живий Mongo, живий Anthropic API — чи реально модель відповідає англійською) |
| `docs/CHANGELOG.md` | Запис у `Unreleased`/наступну версію за форматом файлу: «Full UK/EN interface; AI questions and feedback follow the language chosen at session start» |

- [ ] **Step 4: Повна перевірка**

Run: `cd /d/AI-interview-trainer && npx vitest run && npm run lint && npm run build && cd client && npx vitest run && npm run lint && npm run build`
Expected: усе зелене. CI-перевірка drift OpenAPI: `lang` додано в контракт.

- [ ] **Step 5: Commit, push, чернетка PR**

```bash
cd /d/AI-interview-trainer && git add -A && git commit -m "docs(i18n): record the lang schema change, API contract and finished i18n" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" && git pull --ff-only origin main && git push -u origin feat/ai-session-language
gh pr create --draft --base main --head feat/ai-session-language --title "feat(interview): AI questions and feedback follow the session language" --body "$(cat <<'EOF'
## What changed
- `POST /api/interview/start` accepts `lang: 'uk' | 'en'` (omitted → `uk`, invalid → 400); stored in new optional `InterviewSession.lang`.
- `generateQuestion` / `reviewAnswer` / `answerQuestion` take `lang`; `submitAnswer` and `getActiveSession` read it from the session (`session.lang ?? 'uk'`, so old sessions stay Ukrainian).
- `NewSessionPage` sends the active UI language when the session starts.
- Schema-change log entry in `docs/data-model.md`, OpenAPI updated, docs/rules brought in line.

## Why
Part 4 of 4 of the full i18n (spec: `docs/superpowers/specs/2026-10-04-i18n-completion-design.md`). The session keeps one language so the stored history is consistent; switching the UI mid-interview doesn't change it.

## How to check
- `npx vitest run && npm run lint && npm run build` (server), `cd client && npx vitest run && npm run lint && npm run build`
- Not verified against the live Anthropic API: please start one session in each language and confirm the question, feedback and model answer come back in that language.

## Related issues
Closes the i18n item in `docs/PRD.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review (виконано при складанні плану)

- **Покриття спеку:** §3.1 → A1–A2; §3.2 → B1–B3, C1–C4; §3.3 → A3; §4 → D1–D3 (+D4 клієнт); §5 тести → у кожній задачі, паритет A4, гвардія C5; §6 порядок PR → частини A–D; оновлення документів після (4) → D5.
- **Placeholder scan:** немає TBD/«додати обробку»; місця, що залежать від невідомого коду (`PasswordField` props, `TopicPicker` розмітка, `FeedbackCard` baseProps, структура `LoginPage` констант), явно містять інструкцію `Read` файл і приклад, а не пропуск.
- **Узгодженість типів:** `Lang`, `currentLang`, `setLanguage`, `LANG_STORAGE_KEY` (A1) → використані в A2/A3/D4; `LANGS`/`Lang` (D1) → D2/D3; сигнатури AI-функцій з `lang` останнім обов'язковим параметром однакові в D2 і D3; ключі локалей, перевикористані між задачами (`common.tagline`, `auth.*`, `shell.logout`, `new.start`, `common.noneCompleted`, `progress.*`, `hist.*`), визначені в задачі, що йде раніше за споживача.
- **Відомі ризики плану:** обсяг заміни ~230 рядків — лишається гвардія C5 як сітка безпеки; немає перевірки реального Anthropic API (позначено в PR D).
