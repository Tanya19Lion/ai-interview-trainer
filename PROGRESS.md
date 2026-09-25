# Прогрес: client/ → відповідність HTML-макетам

Робочий документ для продовження задачі "довести `client/` до вигляду й функціональності
`diff-*.html` макетів" в наступних сесіях. Повний план (контекст, обґрунтування рішень) лежить
у `C:\Users\Tanya\.claude\plans\review-the-html-templates-lexical-rossum.md` — цей файл лише
короткий знімок стану виконання плюс усе, що не варто загубити між сесіями.

## Як продовжити

Усі 10 задач із початкового плану позначені ✅ — client/ функціонально та візуально (наскільки
можна без живого Mongo) відповідає всім трьом `diff-*.html` макетам. Що лишилось — не нові
задачі з плану, а хвости, зафіксовані в самих пунктах нижче:
- ручна перевірка проти живого Mongo (задачі 4–9 позначені як не перевірені з реальними даними);
- перемикання мови й мобільний nav-toggle на лендингу (задача 10).

Якщо потрібна нова задача поза цим планом — постав її як звичайний запит, а не "продовж за
PROGRESS.md".

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

6. **✅ HomePage** (`client/src/pages/HomePage.tsx` + `.module.css`, маршрут `/` під
   `ProtectedLayout`, замінив попередній `<Navigate to="/interview/new" replace>`). За зразком
   `#screen-home`: `profileCard` (аватар/ініціал, ім'я, email з `useMe`, кнопка "Вийти" —
   `useLogout`; лінки-заглушки "Змінити профіль"/"Сповіщення" з макета свідомо **не** перенесені,
   бо для них немає бекенду), badge-рядок (`сесій`/`точність`/`🔥 серія`/`сильна тема` з нового
   `GET /api/stats` — `hooks/useStats.ts` → `api/stats.ts` → `types/stats.ts`), resume-картка
   (з `GET /api/interview/active` через новий `hooks/useActiveSession.ts` — показує CTA
   "Продовжити"/"Обрати нову тему", або, коли активної сесії нема, "Почати співбесіду"), список
   останніх 5 сесій (новий `hooks/useHistory.ts` → `getHistory` у `api/interview.ts`, доданий
   поруч із вже наявним `getSessionDetail`; сам ендпоінт `GET /api/history` уже існував, клієнт
   просто раніше його не викликав), лінки-картки на `/history` і `/progress` (маршрути ще не
   існують — впадуть у catch-all `*` → `Navigate to="/"`, це очікувано до задач 7/8).
   `"рівень: Middle"` з макета — у макеті статичне значення без реального джерела; на клієнті
   замінено на **похідне** значення: найчастіший `level` серед сесій користувача з history
   (тег не рендериться, якщо історія порожня) — свідомий вибір не фабрикувати дані.
   `tsc -b --noEmit`, `oxlint`, `npm run build` — усі чисті і на клієнті, і на сервері (сервер не
   чіпався).
   **НЕ перевірено візуально** — так само, як AppShell у задачі 4, ця сторінка вимагає піднятого
   Mongo + `.env` (`JWT_SECRET`, Mongo connection string, опц. `GOOGLE_CLIENT_ID`), яких у цій
   сесії не було. Перед тим, як вважати задачу остаточно закритою, варто хоч раз відкрити `/` в
   браузері з живим бекендом і звірити всі чотири стани картки-badge/resume/recent-list/links.

7. **✅ HistoryPage** (`client/src/pages/HistoryPage.tsx` + `.module.css`, маршрут `/history` під
   `ProtectedLayout`). Фільтр-чіпи тема/рівень керують query-параметрами `GET /api/history`
   напряму (реальний бекенд-фільтр, не client-side приховування рядків, як у макеті) —
   `hooks/useHistory.ts` уже підтримував `filters`, просто раніше викликався без них.
   `components/HistoryTable/HistoryTable.tsx` (+ `.module.css`) — таблиця сесій з responsive
   card-view на мобільному (`data-label`-патерн через CSS, 1:1 з макетом), статус
   схвалено/повторити рахується client-side як `averageScore >= 7` (той самий поріг, що в
   `reviewData`/`scoreClass` макета). Клік на «переглянути» відкриває
   `components/ReviewModal/ReviewModal.tsx` (+ `.module.css`, новий `hooks/useSessionDetail.ts` →
   `getSessionDetail`, вже існував з задачі 5) — один `EditorWindow` із заголовком
   `session · {topic}/{level}/answer.md`, всередині по черзі **всі** питання сесії (не одне, як у
   спрощеному макеті з фейковими даними): `CodeDiffLine variant="question"` + видалено/додано-рядки
   + `EditorComment`, розділені тонкою лінією; footer — середній бал і `LevelChip`.
   **Виявлений і закритий бекенд-розрив**: `AnswerReview.correctAnswer` (те, що повертає
   `reviewAnswer`) рахувалось на кожен submit, але ніколи не зберігалось у
   `questionAttemptSchema` — тобто `GET /api/history/:id` фізично не міг віддати правильну
   відповідь для рендеру діфф-картки в `ReviewModal`. Виправлено додаванням обов'язкового поля
   `correctAnswer` в `src/models/InterviewSession.ts` і збереженням його в
   `src/controllers/interview.controller.ts:submitAnswer`; клієнтський
   `QuestionAttempt` (`client/src/types/interview.ts`) синхронізовано тим самим полем.
   Заодно доданий спільний `client/src/lib/topicLabel.ts` (`TOPIC_LABEL`) — текстове
   відображення теми (`nodejs` → `node.js` тощо), використовується в `HistoryTable`,
   `HistoryPage`-фільтрах, `ReviewModal` і задним числом підключений у вже готовому `HomePage`
   замість друку сирого значення enum.
   `tsc -b --noEmit`, `oxlint`, `npm run build` — чисто на клієнті; `tsc --noEmit`, `eslint .` —
   чисто на сервері (після зміни схеми/контролера).
   **НЕ перевірено візуально** — та сама причина, що й у задачах 4/6: без живого Mongo `RequireAuth`
   одразу редіректить `/history` на `/login`, перевірено лише сам факт коректного редіректу (без
   помилок у консолі). Реальний рендер таблиці, фільтрів і `ReviewModal` із живими даними — ще
   не бачений в браузері.

8. **✅ ProgressPage** (`client/src/pages/ProgressPage.tsx` + `.module.css`, маршрут `/progress`
   під `ProtectedLayout`). Бейдж-рядок (точність/🔥серія/сесій усього/сильна тема — з `GET
   /api/stats`, уже підключеного в задачі 6). Новий `components/Heatmap/Heatmap.tsx`
   (+ `.module.css`) — **не** копія фейкового PRNG-грида з макета: рахує реальні клітинки з
   `completedAt` в історії (`GET /api/history` без фільтрів), `bucketize(count): 0-4` — чиста
   функція, пороги `0/1/2/3-4/5+`. Свідомо відхилився від розмірності сітки макета
   (`repeat(30,1fr)` × 7 = 210 днів ≈ 7 місяців) — з нею напис "N співбесід за останні 12 місяців"
   був би неправдивим; замінено на `repeat(53,1fr)` × 7 = 371 днів, щоб заголовок відповідав
   реальному вікну даних. Accuracy-by-topic бар-чарт — з `byTopic` (кольори через
   `scoreTone(accuracy * 10)`, той самий поріг 8/5, що й у `ScoreChip`, а не окрема шкала).
   Trend-графік (SVG polyline, координати рахуються client-side з останніх ≤10 завершених сесій,
   відсортованих за `completedAt`) і "розподіл за рівнем складності" (stacked bar) — обидва
   порахував client-side з `GET /api/history`, як і планувалось (бекенд-агрегатів для них немає);
   обидва мають явний empty-state замість порожнього віджета, коли даних <2 (тренд) чи 0
   (розподіл). Рекомендації — теми з `byTopic` де `accuracy < 0.8`, до 2 найслабших; на відміну
   від макета (куратор написав конкретні "індекси, нормалізацію, типи JOIN-ів" для кожної теми
   вручну) опис узагальнений — на бекенді немає джерела правди для таких кураторських підказок
   per-topic, вигадувати їх було б нечесно.
   **Виявлений і закритий бекенд-розрив**: `GET /api/stats`'s `byTopic` віддавав лише
   `{topic, accuracy}` — для рекомендацій потрібна ще кількість спроб ("6 спроб" у макеті), яку
   контролер уже рахував (`count` у `Map`), просто не серіалізував. Додано `count` в
   `src/controllers/stats.controller.ts` і в клієнтський `TopicAccuracy`
   (`client/src/types/stats.ts`).
   `tsc -b --noEmit`, `oxlint`, `npm run build` — чисто на клієнті; `tsc --noEmit`, `eslint .` —
   чисто на сервері.
   **НЕ перевірено візуально** — та сама причина, що й у задачах 4/6/7: без живого Mongo
   `RequireAuth` редіректить `/progress` на `/login`; перевірено лише коректність редіректу й
   відсутність помилок у консолі. Heatmap/trend/level-bar із реальними даними ще не бачені в
   браузері — саме ці три віджети найбільш ризиковано перевіряти лише типами, бо вся їхня логіка
   client-side (дати/бакети/SVG-координати).

9. **✅ Стійкість сесії до перезавантаження** (`client/src/pages/InterviewSessionPage.tsx`).
   Коли `location.state` відсутній (hard reload, прямий лінк, повернення назад у браузері) —
   замість негайного "сесія недоступна" тепер: `hooks/useSessionDetail.ts` (задача 7) тягне
   `GET /api/history/:id`, щоб дізнатись `status`. Якщо `completed` — сторінка одразу рендерить
   `SessionSummary` з уже персистених `questions[]`/`averageScore` (`skipped` рахується як
   `answer === ''`), без жодного "живого" стану відповідей. Якщо `in_progress` — питання (яке
   ніде не персистилось, лише `askedQuestions[]`) довантажується через `GET /api/interview/active`
   (`hooks/useActiveSession.ts`, задача 5), тепер параметризований `enabled`-прапорцем, щоб не
   бити цей — дорогий, з AI-генерацією питання — ендпоінт на кожен звичайний рендер сторінки, а
   лише коли реально потрібен reload-fallback; звірка `activeSession.sessionId === sessionId`
   з URL захищає від showcasing чужої/іншої активної сесії користувача, якщо раптом
   query-параметр і найновіша `in_progress` сесія розійшлися. Проміжний стан — `Spinner`; якщо
   жоден із двох запитів нічого не повернув (сесія не існує/чужа/протухла) — той самий
   "сесія недоступна" текст, що й раніше, лише як останній fallback, а не перша перевірка.
   Заодно виправлено `onHome` в обох гілках `SessionSummary` (`/interview/new` → `/`) — кнопка
   називалась "На головну", але навігувала на "нова сесія" ще до того, як `HomePage` (задача 6)
   взагалі існував; тепер веде туди, куди називається.
   `tsc -b --noEmit`, `oxlint`, `npm run build` — чисто (сервер не чіпався).
   **НЕ перевірено візуально** з живими даними (та сама причина, що й у задачах 4/6/7/8) —
   підтверджено лише, що прямий перехід на `/interview/:id` без сесії коректно редіректить на
   `/login` без помилок у консолі; сам fallback-шлях (reload посеред сесії, reload завершеної
   сесії) вимагає живого Mongo + активної автентифікованої сесії для перевірки.

10. **✅ Лендинг-сторінка + i18n** (`client/src/pages/LandingPage.tsx` + `.module.css`, маршрут
    `/welcome`, публічний — єдиний маршрут поза `ProtectedLayout` і без `RequireAuth` крім
    `/login`; підтверджено в браузері: рендериться без редіректу, на відміну від захищених
    сторінок).
    **i18n**: `react-i18next` нарешті ініціалізовано — `client/src/i18n.ts`
    (`keySeparator:false`/`nsSeparator:false`, бо ключі перенесені 1:1 як пласкі рядки
    `"hero.h1pre"` з мокапового `TRANSLATIONS`, а не вкладені об'єкти), словники
    `client/src/locales/{uk,en}.json`, `main.tsx` обгорнуто в `I18nextProvider`. Додано
    `"resolveJsonModule": true` в `client/tsconfig.app.json` — без нього `tsc -b` не бачив типи
    для імпорту `.json`.
    **Мовний оверлей** — `components/LangOverlay/LangOverlay.tsx`, показується один раз
    (`localStorage['diff-lang-chosen']`), вибір мови викликає `i18n.changeLanguage`.
    **Анімації** (додано за окремим запитом, після первинного порту без них): новий
    `components/Reveal/Reveal.tsx` — переносить мокапове `.reveal`/`.reveal.is-in`
    (IntersectionObserver, спрацьовує один раз, `threshold:0.12`) у React-компонент-обгортку;
    використаний на всіх елементах, де в мокапі був клас `reveal` (section-head'и, log-item,
    picker-card, review-картка, heatmap-картка, level-legend-картка, обгортка history-таблиці).
    Послідовна поява diff-рядків у hero-картці (`anim-line l1`–`l4`) — чистий CSS
    (`animation-delay`), без JS; стаггер-анімація клітинок heatmap — `IntersectionObserver` на
    сітці + inline `transitionDelay: index*4ms` замість імперативних `setTimeout` з мокапу.
    Усе під `@media (prefers-reduced-motion: reduce)` — вимикається, як і в оригіналі.
    **Свідоме відхилення від плану**: `components/Heatmap`/`components/HistoryTable`
    (авторизованого додатку) навмисно **не** перевикористані тут, хоча план це рекомендував —
    обидва мають захардкожений український текст, не проведений через i18n (заголовки колонок,
    "співбесід за останні 12 місяців" тощо). Реюз зробив би англійську версію лендингу частково
    українською. Замість цього — власна, i18n-проста розмітка heatmap/таблиці в
    `LandingPage.tsx`, з детермінованим (не `Math.random()`) псевдо-рандомним генератором клітинок
    heatmap, портованим з мокапу, щоб демо не тасувалося на кожен рендер.
    `tsc -b --noEmit`, `oxlint`, `npm run build` — чисто (сервер не чіпався).
    **Перевірено візуально** (Claude in Chrome, dev-сервер на :5173) — на відміну від задач 4/6-9,
    цей маршрут публічний і не потребує Mongo: hero, "як це працює", демо-пікер тем/рівнів,
    рев'ю-картка, прогрес/heatmap, історія, CTA, footer — усі рендеряться коректно, без помилок у
    консолі. Reveal-секції коректно з'являються при скролі; послідовна поява hero-diff і
    heatmap-стаггер підтверджені (сітка повністю пофарбована після проходу сторінки).
    **НЕ перевірено**: перемикання мови через `LangOverlay` (оверлей не показався в тестовій
    сесії — `localStorage`-прапорець уже стояв з попереднього використання цього ж Chrome-профілю
    в іншій розмові) і мобільний nav-toggle.

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

---

# theme-toggle — SDLC-статус

## Stage 03 — PRD (готово)

`docs/features/theme-toggle/idea-brief.md` (Confirmed) → `docs/features/theme-toggle/PRD.md`
згенеровано повним протоколом `/write-prd`: Socratic-валідація §4 User Stories → §5
Acceptance Criteria → §6 NFR → §7 KPI, потім clean-context critic (Phase 7.5), потім self-check.

**Ключові рішення, зафіксовані в PRD:**
- Персистентність вибору теми — **лише device-local** (закриває idea-brief §15 open question;
  явно НЕ через акаунт-синхронізацію).
- §5 AC свідомо **без authorization-типу** — фіча не має ролей/власників ресурсів; закрито через
  `Override` bullet у §1 ¶4 (a не через штучно притягнутий AC).
- NFR "time to correct-theme first paint" = **≤16ms** (один кадр при 60fps, легкий inline-скрипт
  у `<head>`) — critic (Phase 7.5) підняв [F2] size-class creep на початкові 20ms, після чого
  число звужено до 16ms, аби залишитись у S-розмірі фічі без важкого anti-FOUC механізму.
- §8 Open Questions: усі мають `owner: Tech Lead` (self-check зловив і не пропустив голий `TBD`).

## Stage 04-05 — Architecture (готово, `status: Accepted`)

`docs/features/theme-toggle/sad.md` згенеровано повним протоколом `/architecture-design`:
Explore-скан репо (brownfield) → чорновий драфт §1-§12 → per-section Socratic-валідація
(AskUserQuestion, 4-state machine) → 1 ADR через blast-radius gate → Step 8 clean-context critic
(3 знахідки, усі вирішені) → фіналізаційний коміт. `sad.md`'s `status` вручну виставлено на
`Accepted` після завершення (reviewers-поле очищено) — SAD затверджено користувачем.

**Артефакти:**
- `docs/features/theme-toggle/sad.md` — 12 секцій Arc42, C4 Context (§3), C4 Container (§5),
  2 sequence-діаграми (§6).
- `docs/features/theme-toggle/adr/0001-react-context-for-theme-state.md` — єдиний ADR цього
  проходу (`Accepted`).

**Ключові архітектурні рішення:**
- **Стан теми — React Context** (`client/src/context/theme/{ThemeContext,ThemeProvider,useTheme}`),
  перший такий precedent у `client/src` (ADR-0001; альтернатива — DOM-атрибут+CSS-каскад без
  Context — розглянута й відхилена).
- **Логіка визначення теми**: `localStorage` (`'diff-theme'`) зберігає лише ручний вибір, без
  окремого `isManual`-флага — за відсутності валідного значення тема щоразу обчислюється з
  `prefers-color-scheme`. Одне правило одночасно закриває AC-02 (fallback), AC-03 (пріоритет
  ручного вибору), AC-06 (smart default).
- **Anti-FOUC-механізм (inline `<head>`-скрипт vs `useLayoutEffect`) — досі ВІДКРИТЕ рішення**,
  зафіксоване в §11 SAD з due "перед `break-tasks`" — Step 8 critic зловив, що §5/§6 вже
  малювали його як готовий контейнер, хоча §4/§11 тримали відкритим; виправлено позначкою
  "provisional" у діаграмах. **Це рішення треба буде прийняти до розбиття на таски.**
- **Повна light-палітра (Variant A) записана в §5** — токен-за-токеном мапінг canvas/typography/
  buttons/semantic-кольорів; `editor-window`-картка (diff/AI-фідбек) залишається темною в обох
  темах — це і закриває QG-4 (читабельність фідбеку) найпростішим шляхом: найважливіша поверхня
  взагалі не змінює контраст. Це рішення закрило останні 2 відкриті питання PRD §8 (точні
  кольори, реалістичність ≤100мс NFR) прямо під час Step 8 critic-проходу, а не відкладанням.

## Stage 08 — Реалізація (в процесі)

`docs/features/theme-toggle/tasks/tracker.md` (оновлено 2026-09-14, `stage: "08"`) — задачі
розбито й більшість базової імплементації вже влита в `main`:

- **Merged:** T1 (`ThemeContext`+`useTheme`), T2 (`ThemeProvider`: resolution logic + anti-FOUC —
  відкрите з SAD §11 рішення вже закрито в коді, деталі дивись у самому `ThemeProvider`), T3
  (`main.tsx` wiring), T4 (light-theme токени), T5 (`ThemeToggle` компонент з debounce).
- **In review:** T7 (i18n-лейбли для `ThemeToggle`), T8 (unit-тести resolution-логіки), T9
  (component-тести `ThemeToggle`), T10 (E2E-тест персистентності теми).
- **Not started:** T11 (ручний QA: WCAG AA contrast audit), T12 (ручний QA: perf-верифікація
  QG-1/QG-2).

**Відкритий, задокументований у трекері хвіст (T4, "resolved 2026-09-14", але з подальшим
follow-up):** токени `--green`/`--rust`/`--amber`/`--plum` (+ soft-варіанти) і
`--btn-primary-*` навмисно залишені без light-theme варіанту — вони спільні для diff-карток
(`CodeDiffLine`/`EditorWindow`, які мають лишатись незмінними за QG-4) і для звичайних
badge/chip-компонентів. Перед закриттям T11 потрібне явне рішення: або дати diff-елементам власні
theme-invariant токени, або прийняти amber як primary-колір і переглянути пропозицію SAD §5 —
див. "Blocked notes" у `tracker.md` для повного контексту.

**Наступний крок:** довести T7–T10 до `Merged`, ухвалити рішення з accent-токенами вище, потім
T11/T12.

---

# forgot-password — SDLC-статус

## Stage 10 — API contract (`api-forge`, готово, з відкритим follow-up)

`docs/features/forgot-password/contracts/openapi.yaml` + `api-sync-report.md` згенеровано
(scenario A). Переглянуто й звірено з реальним кодом (`src/controllers/auth.controller.ts`,
`src/middleware/auth.ts`) за запитом користувача.

**⚠ Знайдено й зафіксовано розходження, не помічене першим проходом скіла:** наявні auth-ендпоінти
(`register`/`login`/`googleLogin`/`me`/`requireAuth`) сьогодні повертають помилки як
`{error: string}`, а контракт forgot-password використовує `{code, message, details?}` (дефолт
`api-forge`). **Рішення користувача (2026-09-09):** `{code, message, details?}` — цільовий
формат; наявні ендпоінти треба мігрувати на нього **під час реалізації цієї фічі**, а не залишати
неузгодженими. Зафіксовано в `openapi.yaml`'s `info.description` і в `api-sync-report.md` →
Deviations, щоб не загубилось при переході до `break-tasks`/імплементації.

## Stage 08 — Реалізація (в процесі)

`docs/features/forgot-password/tasks/tracker.md` (оновлено 2026-09-17) розбитий на 17 задач
(T0–T16). З них влито:

- **T2 (Merged, коміт `9714e28`, 2026-09-15):** `src/models/PasswordReset.ts` — колекція
  `PasswordReset` створена.
- **T1 (Merged, комміти `21a0ff0`/`948bee1`, 2026-09-17, повний RED/GREEN TDD-цикл через
  `/tdd`-skill):** `src/models/User.ts` — `tokenVersion: { type: Number, required: true,
  default: 0 }`. REFACTOR-фазу свідомо пропущено (однорядкова зміна схеми, рефакторити нічого).
- **T3 (Merged, комміти `cb3720d`+`c440dd7`/`4d9d466`/`d26a829`, 2026-09-17, повний RGR-цикл
  через `/tdd`-skill):** `src/services/passwordReset.service.ts` —
  `issuePasswordReset`/`verifyAndConsumePasswordResetToken`/`checkUnregisteredEmailRateLimit`,
  обидва rate-limit-шляхи (registered через `PasswordReset`-колекцію, unregistered через окремий
  in-memory sliding-window лічильник per AC-02 gap). REFACTOR виніс `hashToken`,
  `pruneAttemptsWithinWindow`. У RED-фазі знайдено й виправлено окремим fixup-коммітом
  (`c440dd7`) реальний баг тестів — відсутній `beforeEach`-reset спільного мутованого масиву в
  останньому `describe`-блоці, через що очікування ставало недосяжним за будь-якої коректної
  реалізації. **Пізніше фоновий security-рев'ю коміту знайшов і закрив ще одну прогалину (коміт
  `9f44a9e`, 2026-09-17):** `verifyAndConsumePasswordResetToken` покладався лише на наявність
  документа в колекції, а Mongo TTL-індекс (`expireAfterSeconds: 0`) видаляє прострочені
  документи не миттєво, а фоновою періодичною розгорткою — у цьому вікні прострочений токен
  приймався б як валідний. Виправлено явною перевіркою `expiresAt` у сервісі (тест-спочатку:
  новий RED-тест підтвердив вразливість, потім фікс).
- **T4 (Merged, задокументовано коммітом `d3b4127`, 2026-09-17):** окремої реалізації не
  знадобилось — Scope і DoD уже повністю закриті кодом remember-me T1/T9
  (`src/middleware/auth.ts`'s `requireAuth`/`hasValidTokenVersion`,
  `src/controllers/auth.controller.ts`'s `issueSession`), той самий механізм ADR-0002.

Решта (T0 spike email-провайдера, T5–T16 роути/клієнт/тести) — ще **Not started** за самим
трекером.

**⚠ Розбіжність з трекером (комміти `0ebc7f1`/`48dc118`, 2026-09-16):** зʼявився
`client/src/pages/ResetPasswordPage.tsx` (маршрут `/reset-password`, підключений з `LoginPage`'s
"Забули пароль?") — але це **UI-only мок**, без жодного реального бекенд-ендпоінта чи розсилки
листів (сам коміт це прямо каже). Формально це попереду задач T9/T10 з трекера (які за описом
залежать від T6/T7 — реальних `/api/auth/password-reset/*`-ендпоінтів, яких ще нема), тож
`tracker.md` досі коректно показує T9/T10 як `Not started` — не позначай їх виконаними через появу
цього мока. Заодно `components/AuthAmbientBackdrop/` — спільна декорація, винесена з
`LoginPage`/`ResetPasswordPage` (раніше дублювалась 1:1).

---

# remember-me — SDLC-статус

`docs/features/remember-me/` — PRD, SAD, 3 ADR (`0001` — поширення tokenVersion-лічильника на
logout, `0002` — окремий refresh-токен для "запам'ятованих" сесій, `0003` — Mongo-лічильник для
login-рейтліміту) і `docs/features/remember-me/tasks/tracker.md` (`stage: "08"`, `feature_size: M`,
13 задач T1–T13) — усе вже існує, хоча в цьому файлі ця фіча раніше не згадувалась.

**Фактично реалізовано в коді; `tracker.md` синхронізовано 2026-09-16:**

- **T2** (issueSession: access+refresh токени, параметр `rememberMe`) — коміт `098f796`
  (2026-09-14): `src/controllers/auth.controller.ts` видає refresh-токен-cookie, коли
  `rememberMe: true`; тест `auth.controller.test.ts`.
- **T5** (login rate-limit middleware) — коміт `bfc3c14` (2026-09-15): новий
  `src/middleware/rateLimit.ts` + `rateLimit.test.ts`, підключено в `src/routes/auth.routes.ts`.
- **T8** (client `api/auth.ts`: rememberMe + refresh) — коміт `bdf5e72` (2026-09-15):
  `client/src/api/auth.ts` отримав параметр `rememberMe` і функцію `refreshSession`.
- **T1** (`requireAuth`: tokenVersion-перевірка) — коміт `76a4e6b` (2026-09-16): `requireAuth`
  тепер async, звіряє `tokenVersion` токена з `User.tokenVersion` через новий
  `hasValidTokenVersion` (`src/middleware/auth.ts`); тест `auth.test.ts` (5/5). Статус у
  `tracker.md`: `In review` (закомічено в `main` локально, PR/push ще не робились).
- **T3** (`POST /api/auth/refresh`-хендлер) — коміт `6638fbc` (2026-09-16): новий
  `refreshSession` у `auth.controller.ts` + роут у `auth.routes.ts`; перевіряє
  `refreshToken`-кукі й `tokenVersion` (перевикористовує T1), видає лише нову `token`-кукі. 8
  тестів (2 401-гілки, happy path, QG-3 clock-only перевірка через spy на `jwt.verify`). Статус:
  `In review`.
- **T4** (logout підвищує tokenVersion) — коміт `21a156e` (2026-09-16): `logout` тепер async,
  верифікує `token`-кукі й інкрементує `User.tokenVersion` (`$inc`) перед очищенням обох кук.
  4 тести, включно з "replay pre-logout access token → 401" (доводить наскрізний ланцюжок
  T1↔T2↔T4). Статус: `In review`.

**Три коміти (`76a4e6b`, `6638fbc`, `21a156e`) є в локальному `main`, попереду `origin/main` —
не запушені.** Тести T1/T3/T4 мокають `UserModel` цілком (без реального Mongo) — той самий підхід,
що вже усталений у `rateLimit.test.ts`.

- **T9** (`useAuth.ts` silent access-token renewal) — коміт `54dbd13` (2026-09-17, повний
  Red-Green-Refactor TDD-цикл): новий `useTokenRenewal(enabled)` у `client/src/hooks/useAuth.ts`
  — React Query `refetchInterval`-запит (`RENEWAL_INTERVAL_MS = 4 хв`), що періодично викликає
  T8's `refreshSession()`; підключений у `RequireAuth.tsx` як `useTokenRenewal(me.isSuccess)`.
  Механізм тригера (`refetchInterval` проти `setTimeout` на дубльованому `JWT_EXPIRES_IN`) — 
  свідомо винесений на рішення користувача, обрано `refetchInterval` саме щоб уникнути жорсткого
  зв'язку конфігурації клієнт↔сервер (токен лежить у httpOnly cookie, JS не може прочитати його
  реальний `exp`). На справжній 401 від `refreshSession()` (відкликаний/протухлий refresh-токен)
  інвалідує `['me']`-запит, щоб існуюча 401-обробка `RequireAuth`/`useMe()` підхопила стан, а не
  мовчки й нескінченно ретраїла — цей кейс спершу пропустили в першій версії (знайдено
  повторним `/code-review`, закрито другим RED/GREEN циклом до коміту).
  Нові тести: `client/src/hooks/useAuth.test.tsx` (3), `client/src/RequireAuth.test.tsx` (3) —
  enabled/disabled стан, 401-хендофф, інтервальний тайминг через fake timers.
  `tsc -b`, `oxlint`, `npm run build`, повний `vitest run` (клієнт, 15/15) — чисті. Статус:
  `In review`.

**T6 (інтеграційний тест ревокації сесії, QG-1) — Not started, відкрите питання, ще не вирішене
користувачем:** сам текст задачі вимагає тестів проти *реальної* Mongo (`UserModel.create`, без
моків), але єдиний `MONGODB_URI` у репозиторії (`.env`) вказує на віддалений Atlas-кластер, схожий
на реальну/dev базу — не ізольовану тестову; `mongodb-memory-server` чи інша тестова
БД-інфраструктура в репозиторії відсутня. Запуск T6 "як написано" писав би тестових користувачів у
цю живу базу при кожному `npm run test`. Користувачу задано питання про стратегію (додати
`mongodb-memory-server` / перевикористати мок `UserModel` як у T1/T3/T4 / свідомо писати в
Atlas-кластер / відкласти T6) — відповідь ще не отримана, продовжувати T6 без неї не варто.

**Ще Not started:** T7/T12/T13 (тести — T12 частково вже покрито T1/T3-тестами, T7 k6-смок), T10
(чекбокс "запам'ятати мене" на `LoginPage`), T11 (Manual QA:
live-Mongo verification + фінальний PROGRESS.md апдейт, заблокований усіма іншими задачами —
цей запис досі проміжний знімок, а не той фінальний T11-апдейт).

---

# interview-flow — статус ведеться окремо

`docs/features/interview-flow/STATUS.md` тепер виконує для цієї фічі ту саму роль, що
`PROGRESS.md` — для репозиторію в цілому (сказано прямо в першому рядку файлу). Актуальний стан:
повний цикл сесії (старт → до 5 AI-оцінених відповідей → завершення) реалізовано end-to-end,
історичний баг з `correctAnswer` виправлено; **не перевірено** — жодна authenticated-фіча, включно
з цією, проти живого Mongo+`.env` з часу auth/AppShell-робіт. Код-рев'ю (2026-09-16, ще не
закомічено) виявило й закрило ще 4 проблеми в цій фічі (skip-відповідь завжди повертала 400,
відсутній error-handling middleware, послідовні замість паралельних AI-виклики, сирий enum замість
`TOPIC_LABEL`) — попутно оновлено `express` `^4.21.2` → `^5.2.1`. Дивись сам `STATUS.md` для
деталей, а не дублюй його тут.

---

# Тема `system-design` (2026-09-25)

**✅ Влито в `main` (PR #3, коміт `cf6f25d`):** `'system-design'` додано в `TOPICS` на сервері
(`src/models/InterviewSession.ts`) і клієнті (`client/src/types/interview.ts`), плюс обов'язкові
ключі в `Record<Topic, …>`-мапах (`client/src/lib/topicLabel.ts`,
`client/src/components/TopicPicker/TopicPicker.tsx`) і запис у Schema-change log
(`docs/data-model.md`, 2026-09-25). `LEVELS` не змінювався.

Це був навчальний експеримент з двома паралельними агентами в окремих worktree на одному
спільному модулі: гілка A (`system-design`) влита; гілка B (рівень `staff`) свідомо **не** влита
й видалена за рішенням користувача. Злиття A→B давало очікувані конфлікти в
`src/models/InterviewSession.ts` і `docs/data-model.md`.

**Відкриті хвости:**
- `npm test` (сервер і клієнт) на злитому `main` не запускався — перевірено лише `tsc`/`eslint`/
  `oxlint` і хук `check_enums.py`.
- Опис теми в `TopicPicker.tsx` («Масштабування, компроміси, архітектура систем») і мітка
  `'system design'` у `topicLabel.ts` написані агентом — не переглянуті людиною.
- Ручні переліки тем, що досі закінчуються на `restapi`: `docs/features/interview-flow/`
  (`data-model.md`, `idea-brief.md`, `openapi.yaml`, `api-sync-report.md`). `check_enums.py` їх не
  бачить — синхронізувати вручну, якщо ці документи мають лишатись актуальними.

---

# Тестова інфраструктура

**✅ Виправлено (коміт `02ab980`, 2026-09-15):** кореневий `npm run test` не мав власного
`vitest.config.ts`, тож дефолтний глоб vitest підхоплював тести `client/` (яким для роботи
потрібне `environment: 'jsdom'`, наявне лише в `client/vitest.config.ts`), Playwright-специфікацію
`client/e2e/theme-persistence.spec.ts` (падала одразу — vitest не вміє виконувати Playwright'ів
`test()`) і дубльований тест з осиротілого git-worktree `.claude/worktrees/theme-toggle-t1`.
Додано корінний `vitest.config.ts` (`include: src/**/*.test.ts`, `exclude` клієнта й worktrees) —
`npm run test` тепер запускає лише бекенд (3 файли/11 тестів, чисто). Заодно додано
`make test-client` (`cd client && npm run test`) як симетричну до `dev`/`dev-client` команду для
клієнтських тестів, і прибрано git-метадані worktree `theme-toggle-t1` (сама папка на диску
видалена вручну користувачем окремо).

**Команди верифікації тепер:** `npm run test` (корінь, бекенд) і `cd client && npm run test`
(або `make test-client`) — окремо, а не одна кореневою командою на весь репозиторій.
