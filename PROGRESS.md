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