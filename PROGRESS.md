# Прогрес: client/ → відповідність HTML-макетам

Робочий документ для продовження задачі "довести `client/` до вигляду й функціональності
`diff-*.html` макетів" в наступних сесіях. Повний план (контекст, обґрунтування рішень) лежить
у `C:\Users\Tanya\.claude\plans\review-the-html-templates-lexical-rossum.md` — цей файл лише
короткий знімок стану виконання плюс усе, що не варто загубити між сесіями.

## Як продовжити

Скажи Claude: "продовж з задачі N" або просто "продовжуй за PROGRESS.md" — нижче для кожної
задачі є або конкретний наступний крок, або посилання на розділ плану.

## Статус задач (1–10)

1. **✅ Синхронізація `TOPICS` клієнт↔сервер** — `client/src/types/interview.ts` тепер має
   `nextjs`/`html`; `TopicPicker.tsx` оновлено (типізація `Record<Topic,...>` сама ловить
   пропущені ключі). Ідея на майбутнє (свідомо відкладена): shared-package для `TOPICS`/`LEVELS`
   вимагав би npm workspaces — не робити без окремого запиту.

2. **✅ Email/password автентифікація на бекенді** — `src/models/User.ts` (`passwordHash`
   опціональний, `googleId` опціональний+`sparse`), `src/controllers/auth.controller.ts`
   (`issueSession` спільна для `register`/`login`/`googleLogin`, лінкування Google-акаунта до
   існуючого email/password-користувача), `src/routes/auth.routes.ts`
   (`POST /auth/register`, `POST /auth/login`). Додано `bcryptjs` до `package.json`.

3. **✅ Реальний логін на клієнті** — `client/src/api/auth.ts` + `hooks/useAuth.ts` (без
   `devLogin`, є `useGoogleLogin`/`useRegister`/`useLoginWithPassword`/`useLogout`),
   `main.tsx` обгорнуто в `GoogleOAuthProvider`, нова `pages/LoginPage.tsx` (+ `.module.css`),
   нові компоненти `Tabs`, `PasswordField`, `TextField`, `EditorComment` (винесений з
   `FeedbackCard` — тепер спільний). `RequireAuth.tsx` спрощено до `<Navigate to="/login">`.

4. **✅ AppShell і навігація.**
   `client/src/components/AppShell/AppShell.tsx` (+ `.module.css`) — звичайна навігація
   (Кабінет/Нова сесія/Історія/Прогрес, avatar-меню з logout, закриття по кліку поза меню) і
   sticky focus-bar під час активної співбесіди (гілка/прогрес/кнопка виходу з
   `window.confirm`). Новий `client/src/lib/interviewFocus.ts` — React Context, через який
   `InterviewSessionPage` повідомляє `AppShell`, що зараз активна співбесіда (лежить у
   layout-предку, тому passing "вгору" тільки через Context+setter, не props). Новий
   `client/src/ProtectedLayout.tsx` об'єднує `RequireAuth`+`AppShell`+Context-provider;
   `AppRoutes.tsx` тепер має `<Route element={<ProtectedLayout />}>` як батьківський layout-route
   для `/interview/new` і `/interview/:sessionId`. З `InterviewSessionPage.tsx` прибрано
   дубльований inline `Eyebrow`+`ProgressSegments` (тепер це показує focus-bar).
   `tsc -b --noEmit`, `oxlint`, `npm run build` — усі чисті.
   **Візуально перевірено (Claude in Chrome, dev-сервер на :5173):** `/login` — обидва таби
   (Увійти/Зареєструватися), перемикач видимості пароля, ambient `EditorWindow`-декорація —
   рендеряться коректно й відповідають макету. Під час перевірки знайдено й виправлено реальний
   баг: `GoogleLogin`'s `onSuccess` передавався інлайн-стрілкою → новий референс на кожен
   ре-рендер `LoginPage` (кожне натискання клавіші в паролі) → бібліотека `@react-oauth/google`
   реініціалізувала Google Identity Services щоразу (`console.warn`
   `google.accounts.id.initialize() is called multiple times`). Виправлено обгортанням у
   `useCallback` (`handleGoogleSuccess`); після фіксу — 0 попереджень при тих самих діях.
   **НЕ перевірено візуально:** сам `AppShell` (звичайна навігація й focus-bar) — вони
   рендеряться лише за автентифікованою сесією, а піднятого MongoDB/бекенду в цій сесії не було,
   тож `RequireAuth` одразу редіректив на `/login` і далі не пускав. Це природно перевіриться
   разом із задачею 6 (HomePage) — перша реальна сторінка за `AppShell`.

5. **✅ Бекенд-ендпоінти для активної сесії та деталей історії.**
   `GET /api/interview/active` (`src/controllers/interview.controller.ts:getActiveSession`) —
   повертає найновішу `status: 'in_progress'` сесію юзера (204, якщо немає); питання
   перегенеровується через `generateQuestion` з уже заданих `askedQuestions` (сам текст
   "поточного" питання ніде не персистився — так само, як і раніше в `submitAnswer`).
   `GET /api/history/:id` (`src/controllers/history.controller.ts:getSessionDetail`) — єдиний
   ендпоінт для й "продовжити" (in_progress), й "переглянути" (completed): повертає сесію
   незалежно від `status`, з повним `questions[]`; 404 для чужого/неіснуючого `_id`; фронтенд
   розрізняє режим за полем `status` у відповіді. Свідомо **не** зроблено окремих ендпоінтів під
   кожен кейс — так вирішили при плануванні, щоб не дублювати майже ідентичну логіку.
   Виправлено баг зі `streakDays` (`src/controllers/stats.controller.ts`) — рахується як
   найдовший ланцюжок послідовних UTC-календарних днів `completedAt`, що починається із
   сьогодні/вчора (інакше `0`); без урахування таймзони клієнта — свідомий вибір, простіше й
   детерміновано. Клієнт: нові типи `ActiveSessionResponse`/`InterviewSessionDetail`/
   `QuestionAttempt`/`SessionStatus` у `client/src/types/interview.ts`, функції
   `getActiveSession`/`getSessionDetail` у `client/src/api/interview.ts`; `apiFetch` у
   `client/src/api/client.ts` тепер коректно обробляє `204 No Content` (повертає `undefined`
   замість падіння на `res.json()` з порожнім тілом).
   `tsc`/`lint`/`build` чисті і на сервері, і на клієнті. **НЕ перевірено вручну** через живий
   Mongo (немає піднятої БД у цій сесії) — самі ендпоінти новим тестом/ручним запитом не
   пройдені, тільки типоперевіркою. Перед покладанням на них у задачах 6/7/9 варто хоча б раз
   смокнути вручну (стартувати сесію, зробити `GET /interview/active`, завершити сесію в різні
   дні й звірити `streakDays`).

6. **⬜ HomePage** (`client/src/pages/HomePage.tsx`, маршрут `/`) — картка профілю, badge-рядок,
   картка "продовжити сесію" (залежить від задачі 5), список останніх сесій (`GET /api/history`),
   лінки на History/Progress. Замінить поточний `<Navigate to="/interview/new">` на `/`.

7. **⬜ HistoryPage** (`/history`) — фільтр-чіпи topic/level → query-параметри `GET /api/history`,
   `HistoryTable` компонент (responsive card-view на мобільному), `ReviewModal` з `EditorWindow`
   всередині (залежить від `GET /api/history/:id` із задачі 5).

8. **⬜ ProgressPage** (`/progress`) — `Heatmap` (з дат `completedAt` в history), accuracy-by-topic
   бар-чарт (`GET /api/stats` `byTopic`), trend-графік і level distribution — рахувати client-side
   з `GET /api/history` (бекенд-агрегатів для них немає). Рекомендації — похідні від `byTopic`.

9. **⬜ Стійкість сесії до перезавантаження** — `InterviewSessionPage.tsx` fallback на
   `GET /api/history/:id`, коли `location.state` відсутній (замість "сесія недоступна").

10. **⬜ Лендинг-сторінка + i18n** (`/welcome`, публічний) — порт `diff-ai-interview-trainer.html`,
    ініціалізація `react-i18next` (встановлено, ще не використовується), мовний оверлей.
    Найнижчий пріоритет — публічна сторінка, не критичний функціонал.

## Відомі залежності між задачами

- Задачі 6 (Home), 7 (History-модалка), 8 (Progress) і 9 (reload-стійкість) більше не блоковані
  задачею 5 — ендпоінти й фікс `streakDays` готові (не перевірені вручну проти живого Mongo,
  див. пункт 5 вище).

## Env-змінні, потрібні для повноцінного ручного тестування

Жодного `.env`/`.env.example` у репозиторії немає — при першому запуску `npm run dev`
(сервер або клієнт) запитай користувача:

- Сервер (корінь репо): `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `CLIENT_URL`,
  Mongo connection string (`src/config/db.ts`).
- Клієнт (`client/`): `VITE_GOOGLE_CLIENT_ID` (для Google-кнопки), опціонально `VITE_API_URL`.

Без `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` Google-логін не запрацює, але шлях
email/password (задача 2+3) працює одразу після підняття Mongo + `JWT_SECRET`.

## Команди верифікації, які використовувались після кожної задачі

```bash
cd client && npx tsc -b --noEmit && npm run lint && npm run build   # клієнт
cd .. && npx tsc --noEmit && npm run lint                            # сервер (з кореня репо)
```