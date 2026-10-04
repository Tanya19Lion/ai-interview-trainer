# Повний i18n (клієнт + мова ШІ) — дизайн

Дата: 2026-10-04 · Статус: чернетка на рев'ю

## 1. Мета

Довести локалізацію до кінця: перемикання UK/EN діє на весь застосунок, а питання, фідбек і
«можлива відповідь» від ШІ генеруються мовою, обраною користувачем. Закриває пункт
`docs/PRD.md:198` (перемикач мови на лендингу).

**Критерії успіху**
- Жодного хардкоду українською в `client/src` (поза `App.tsx` — dev-вітриною, `*.test.*` і коментарями).
- Вибір мови переживає перезавантаження; перший візит визначається за `navigator.language`.
- Нова сесія з `lang: 'en'` отримує питання, фідбек і `correctAnswer` англійською; перезавантаження
  сесії (`GET /active`) лишається тією ж мовою.
- Старі сесії без `lang` працюють як раніше (українською).
- `uk.json` і `en.json` мають однаковий набір ключів (перевіряє тест).

## 2. Поза межами

- Переклад уже збережених питань/відповідей в історії.
- Серверні повідомлення про помилки (`res.json({ error })`) — лишаються англійською, клієнт показує власні тексти.
- Мова як налаштування профілю користувача в БД.
- `client/src/App.tsx` («вітрина компонентів», dev-only).
- Зміна стеку: лишається `react-i18next`, пласкі ключі `section.key`, `keySeparator: false`, один
  `uk.json`/`en.json` (відхилено: namespace-файли на сторінку; окремі словники в `lib/`).

## 3. Клієнт

### 3.1 Ядро мови (`client/src/i18n.ts`)
- Початкова мова: `localStorage['diff-lang-chosen']` → `navigator.language` (`uk*` → `uk`, інакше `en`) → `uk`.
- Зміна мови: оновлює `localStorage`, `document.documentElement.lang`.
- Постійний перемикач UK/EN поруч із `ThemeToggle` (в `AppShell` і на `LandingPage`). `LangOverlay`
  лишається першим вибором і використовує ту саму логіку збереження (зараз пише в `localStorage`,
  але `i18n.ts` це значення ніколи не читає).

### 3.2 Рядки
- Усі хардкоди в ~20 файлах переходять у ключі `t()`: `HomePage`, `HistoryPage`, `ProgressPage`,
  `LoginPage`, `ResetPasswordPage`, `InterviewSessionPage`, `NewSessionPage`, `AppShell`,
  `AnswerForm`, `FeedbackCard`, `ReviewModal`, `HistoryTable`, `Heatmap`, `TopicPicker`,
  `LevelPicker`, `SessionSummary`, `ConfirmDialog`, `RequireAuth`, `PasswordField`, `TextField`,
  `Spinner`, `Eyebrow`, `AuthAmbientBackdrop`.
- Лейбли з `lib/` (`levelLabel`, `topicLabel`) і `scoreTone` — через `t` (хук або аргумент), не
  дублюючи мапу в двох місцях.
- Множини («сесій», «питань») — `_one/_few/_many` (uk) та `_one/_other` (en) через `count`.
- `en.json` отримує переклад усіх ключів; `card.betterAnswer` → «A possible answer».
  В `FeedbackCard`/`ReviewModal` підписи «Ось твоя відповідь»/«Можлива відповідь» переходять з
  хардкоду на ключі `card.userAnswer`/`card.betterAnswer`.

### 3.3 Дати й місяці
- `lib/formatCompletedAt.ts`: `toLocaleDateString(i18n.language)` замість `'uk-UA'`.
- `Heatmap`: назви місяців із `Intl.DateTimeFormat(i18n.language, { month: 'short' })`.

## 4. Бекенд: мова ШІ

- `POST /api/interview/start` приймає `lang: 'uk' | 'en'`; відсутнє → `uk`; невалідне → 400.
- `InterviewSession.lang` — optional enum-поле (`LANGS = ['uk', 'en'] as const`), **без** `default:` у
  схемі (за `.claude/rules/migrations.md`); fallback `uk` — у `services/`. Клієнтський тип
  `client/src/types/interview.ts` оновлюється вручну (немає спільного пакета).
- `ai.service.ts`: `generateQuestion`, `reviewAnswer`, `answerQuestion` приймають `lang`. Системні
  промпти лишаються, до них додається інструкція відповідати українською/англійською. JSON-контракт
  `reviewAnswer` не змінюється (ключі англійські, значення — мовою сесії).
- `lang` береться **з сесії**, не з тіла наступних запитів: `submitAnswer` і `getActiveSession`
  читають `session.lang ?? 'uk'`.
- Запис у `docs/data-model.md` Schema-change log: нове optional-поле, бекфіл не потрібен
  (старі документи читаються як `uk`), rollback — прибрати читання `lang` у коді, поле у
  документах можна лишити (Mongoose його ігнорує після видалення зі схеми).

## 5. Тести

- Клієнт: паритет ключів `uk.json`/`en.json`; тести компонентів з українським текстом працюють без
  змін (мова в тестах `uk`); тести перемикача (збереження, початкова мова з `navigator.language`);
  `formatCompletedAt` для двох мов.
- Сервер: `lang` потрапляє в промпт для всіх трьох AI-функцій; 400 на невалідне `lang`; сесія без
  `lang` → українська; `getActiveSession` використовує `session.lang`.
- Перевірка: `cd client && npm run build && npm run lint`, `npm run test` (сервер) і `vitest` (клієнт).

## 6. Порядок і PR

Чотири незалежні гілки/PR (по одному, кожен проходить цикл push → draft PR → merge на GitHub):

1. `feat/i18n-core` — ядро мови, перемикач, дати, `LangOverlay`, паритет-тест; закриває задачу 10.
2. `feat/i18n-public-pages` — `LoginPage`, `ResetPasswordPage`, спільні поля (`TextField`,
   `PasswordField`, `Spinner`, `RequireAuth`, `AuthAmbientBackdrop`).
3. `feat/i18n-app-pages` — `AppShell`, `HomePage`, `NewSessionPage`, `InterviewSessionPage`,
   `HistoryPage`, `ProgressPage`, пов'язані компоненти, множини.
4. `feat/ai-session-language` — `lang` в API/схемі/`ai.service`, клієнтський виклик `start`, запис у
   `data-model.md`. Залежить від (1) для джерела мови.

Після (4) оновити `.claude/rules/frontend/overview.md` (твердження «i18n лише на LandingPage»),
`.claude/rules/backend/interview-flow.md`, `docs/CONTEXT.md` (термін «мова сесії»),
`docs/sad.md:373`, `docs/PRD.md:198`, `PROGRESS.md`. ADR не потрібен: це розширення рішення
`0001-initial-setup.md`, а не його перегляд.

## 7. Ризики

- Обсяг: ~300 рядків; найбільший ризик — пропущені хардкоди. Мітигація: grep кириличних літералів
  у `client/src` як частина перевірки кожного PR (залишки — лише `App.tsx`, тести, коментарі).
- Мова зміниться посеред сесії в UI, але сесія лишається у своїй мові: інтерфейс і питання
  можуть розійтись. Прийнято свідомо (простота й узгоджена історія); показувати мову сесії в UI не
  плануємо.
- Модель може проігнорувати інструкцію про мову: перевіряється вручну на живому API, автотест
  покриває лише наявність інструкції в промпті.
