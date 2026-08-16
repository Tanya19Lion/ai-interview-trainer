# Event Storming: домен "diff" (AI Interview Trainer)

Легка вправа Event Storming для продукту "diff" — застосунку для технічних
співбесід у форматі "code review" (React/JavaScript/Node.js/TypeScript).
12 доменних подій виведено з реального коду бекенду (`src/models/User.ts`,
`src/models/InterviewSession.ts`, `src/routes/auth.routes.ts`,
`src/routes/interview.routes.ts`, `src/routes/history.routes.ts`,
`src/routes/stats.routes.ts`) та клієнтських типів (`client/src/types/interview.ts`).

## 12 ключових подій (минулий час)

1. **UserRegistered** — користувач зареєструвався email+password (`POST /api/auth/register`)
2. **UserRegisteredViaGoogle** — користувач зареєструвався/увійшов через Google OAuth, або наявний акаунт було прив'язано до Google за email (`POST /api/auth/google`)
3. **UserLoggedIn** — користувач увійшов email+password (`POST /api/auth/login`)
4. **UserLoggedOut** — користувач вийшов, cookie сесії очищено (`POST /api/auth/logout`)
5. **InterviewSessionStarted** — розпочато нову сесію співбесіди для обраних topic+level (`POST /api/interview/start`)
6. **QuestionGenerated** — AI згенерував чергове питання для сесії
7. **AnswerSubmitted** — користувач надіслав відповідь на поточне питання (`POST /api/interview/:sessionId/answer`)
8. **AnswerReviewed** — AI оцінив відповідь (score, feedback, correctAnswer, weakTopics)
9. **NextQuestionServed** — після рев'ю користувачу видано наступне питання в тій самій сесії
10. **InterviewSessionCompleted** — сесію завершено, обчислено `averageScore` та `completedAt`
11. **SessionHistoryViewed** — переглянуто список/деталі завершених (або активних) сесій (`GET /api/history`, `GET /api/history/:id`)
12. **ProgressStatsComputed** — обчислено агреговану статистику: accuracy по темах, streak днів (`GET /api/stats`)

## Групування у Bounded Context кандидати

### 🟦 Identity & Access

Події: `UserRegistered`, `UserRegisteredViaGoogle`, `UserLoggedIn`, `UserLoggedOut`

Словник:
- **User** — обліковий запис
- **Credentials** — email / passwordHash
- **GoogleAccountLink** — прив'язка Google-акаунта до існуючого email
- **AuthToken** — JWT у httpOnly cookie
- **Session** — авторизаційна сесія користувача (не плутати з InterviewSession)

### 🟩 Interview Session (ядро продукту)

Події: `InterviewSessionStarted`, `QuestionGenerated`, `AnswerSubmitted`, `InterviewSessionCompleted`

Словник:
- **InterviewSession** — сесія співбесіди
- **Topic** — react / javascript / nodejs / typescript / nextjs / css / html / sql
- **Level** — junior / middle / senior
- **QuestionAttempt** — питання + відповідь + результат
- **SessionStatus** — in_progress / completed

### 🟨 AI Review & Feedback

Події: `AnswerReviewed`, `NextQuestionServed`

Словник:
- **Review** — процес оцінювання відповіді
- **Score** — оцінка 0–10
- **Feedback** — текстовий коментар AI
- **CorrectAnswer** — еталонна відповідь
- **WeakTopic** — виявлена слабка тема

### 🟪 Progress & Analytics

Події: `SessionHistoryViewed`, `ProgressStatsComputed`

Словник:
- **History** — перелік минулих сесій
- **AverageScore** — середній бал сесії
- **AccuracyByTopic** — точність у розрізі тем
- **StreakDays** — кількість днів поспіль з завершеними сесіями
- **TopicBreakdown** — розбивка результатів за темами

## Рівень зрілості структури

**Кількість сутностей (Mongoose-моделі в `src/models/`):** 2 — `User`,
`InterviewSession`.

**Розмір команди:** соло-розробник.

**Правило вибору (пороги 3 / 10 + розмір команди):**
- `< 3` сутностей → **Flat**
- `3–10` сутностей → **Feature-first**
- `> 10` сутностей → **Hexagonal per BC**

Розмір команди зсуває межу: соло-розробник тримає нижчий рівень довше (менше
паралельних конфліктів, менше сенсу в ізоляції модулів), велика команда —
переходить на вищий рівень раніше (навіть при малій кількості сутностей, щоб
уникати конфліктів у спільних файлах).

**Обрано: Flat.** 2 сутності `< 3`, і соло-розробник — обидва сигнали тягнуть
до найпростішого рівня, підсилюючи один одного (жоден не суперечить іншому).

**Порівняння з поточною структурою:** `src/` вже організовано пласко за типом
файлу (`models/`, `controllers/`, `routes/`, `services/`, `middleware/`,
`config/`) — це і є Flat. Обраний рівень **не вищий** за поточний, отже
жодного BC не потрібно виокремлювати зараз. Якщо в майбутньому кількість
сутностей перетне поріг 3 (наприклад, з'явиться окрема модель для тем/питань
або окрема сутність для AI-рев'ю), варто буде повернутися до цього документа
й переоцінити рівень.

## Чи змінюється рівень, якщо рахувати сутності як "кількість BC"?

Виникло питання: якщо порахувати "сутності" як самі 4 кандидати BC
(`Identity & Access`, `Interview Session`, `AI Review & Feedback`,
`Progress & Analytics`) замість Mongoose-моделей — чи зміниться обраний
рівень (4 ≥ 3 наче тягне до Feature-first)?

**Ні — і це підміна понять.** Поріг "3 і 10" застосовується до кількості
сутностей **всередині одного BC**, а не до кількості самих BC. Ці метрики
відповідають на різні питання:
- кількість сутностей у BC → чи вистачає внутрішньої складності одного
  контексту, щоб виправдати феатур-папки/гексагональну структуру;
- кількість BC → скільки меж домену взагалі виділено; це індикатор
  надмірної (чи недостатньої) сегментації, а не міра складності модуля.

**Підрахунок по кожному BC окремо (як і задумано правилом):**

| BC | Власних сутностей (моделей) |
|---|---|
| 🟦 Identity & Access | 1 (`User`) |
| 🟩 Interview Session | 1 (`InterviewSession`) |
| 🟨 AI Review & Feedback | 0 — підпроцес усередині `InterviewSession.questions[]`, не окрема модель |
| 🟪 Progress & Analytics | 0 — read-model/агрегація над `InterviewSession`, власної колекції немає |

Кожен BC має 0–1 сутність (`< 3`), тож усі залишаються **Flat** навіть при
пооб'єктній оцінці — висновок не змінюється.

`AI Review & Feedback` і `Progress & Analytics` — це "тонкі" (supporting)
контексти без власного сховища, на відміну від `Interview Session`, де
зосереджена основна складність домену (core subdomain) і найімовірніше
зростання кількості сутностей у майбутньому.

Окреме зауваження: 4 BC на застосунок із лише 2 реальними моделями для
соло-розробника — це радше сигнал можливої надмірної сегментації
(over-segmentation), ніж привід ускладнювати структуру коду.

Mermaid
flowchart LR

    ID["🟦 Identity & Access"]
    IS["🟩 Interview Session"]
    AI["🟨 AI Review & Feedback"]
    PA["🟪 Progress & Analytics"]

    ID -->|"UserRegistered<br/>UserRegisteredViaGoogle<br/>UserLoggedIn"| IS

    IS -->|"AnswerSubmitted"| AI

    AI -->|"AnswerReviewed<br/>NextQuestionServed"| IS

    IS -->|"InterviewSessionCompleted"| PA

    classDef identity fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#111;
    classDef interview fill:#dcfce7,stroke:#16a34a,stroke-width:3px,color:#111;
    classDef ai fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#111;
    classDef analytics fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#111;

    class ID identity;
    class IS interview;
    class AI ai;
    class PA analytics;

flowchart LR

    ID["🟦 Identity & Access"]
    IS["🟩 Interview Session<br/>CORE"]
    AI["🟨 AI Review & Feedback"]
    PA["🟪 Progress & Analytics"]

    ID -->|"publishes"| E1(("UserRegistered"))
    E1 --> IS

    IS -->|"publishes"| E2(("AnswerSubmitted"))
    E2 --> AI

    AI -->|"publishes"| E3(("AnswerReviewed"))
    E3 --> IS

    IS -->|"publishes"| E4(("InterviewSessionCompleted"))
    E4 --> PA



    Віртуалізація вимкнуто

Так, тоді причина знайдена ✅

Docker Desktop не запуститься, поки апаратна віртуалізація вимкнена. Потрібно увімкнути її в BIOS/UEFI.

Що робити
Збережи все, що відкрито, і перезавантаж комп'ютер.
Під час запуску зайди в BIOS/UEFI. Клавіша залежить від виробника — часто це F2, Delete, F10 або Esc.
Знайди налаштування віртуалізації.

Якщо у тебе Intel, шукай щось на кшталт:

Intel Virtualization Technology
Intel VT-x
Virtualization Technology

Якщо AMD:

SVM Mode
AMD-V
Зміни значення на:
Enabled
Збережи зміни (Save & Exit) і завантаж Windows.
Після цього

Відкрий:

Task Manager → Performance → CPU

і переконайся, що:

Virtualization: Enabled

Потім запускай Docker Desktop.

Коли він запрацює, у твоїй папці:

D:\AI-interview-trainer\agentic-engineering-course\modules\4-prompting-mastery\4.8-bc\ts\stage-3-hexagonal

знову виконай:

docker compose up -d

А потім:

docker compose ps
Важливий момент

Якщо це корпоративний/навчальний ноутбук, і ти не можеш зайти в BIOS або налаштування заблоковані, не намагайся обходити обмеження — тоді справді потрібно звернутися до IT.

Якщо скажеш мені модель ноутбука/материнської плати (наприклад, Lenovo IdeaPad 5, HP ProBook 450, ASUS TUF...), я можу підказати, яку саме клавішу натискати і де шукати Virtualization у BIOS.