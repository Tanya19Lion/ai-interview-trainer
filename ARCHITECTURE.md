# ARCHITECTURE.md

## Патерн

Сервер (`src/`) — класичний **layered Express-backend**:

```
routes/        HTTP-маршрути, тільки прив'язка path+method → controller (+ middleware)
controllers/   парсинг request/response, виклик services/models, без бізнес-логіки AI
services/      бізнес-логіка, що не прив'язана до HTTP (наразі: ai.service.ts — Anthropic SDK)
models/        Mongoose-схеми та доступ до MongoDB (User, InterviewSession)
middleware/    наскрізні concerns (auth.ts — перевірка JWT)
config/        ініціалізація зовнішніх з'єднань (db.ts — MongoDB connect)
```

Клієнт (`client/`) — стандартний Vite React SPA: `api/` (HTTP-клієнт до сервера), `hooks/`
(дані + стан), `pages/`/`components/` (UI), `types/` (домен клієнта, дубльований від
Mongoose-схем вручну — спільного пакета типів немає, див. `CLAUDE.md`).

## Dependency rule

Залежності йдуть в один бік, зверху вниз списку вище:

`routes → controllers → services → models`

- `controllers` не імпортують `mongoose`-схеми напряму для бізнес-правил, які логічно належать
  `services` (наприклад, звернення до AI — виключно через `ai.service.ts`).
- `models` нічого не знають про `express` (req/res) — Mongoose-схеми чисті від HTTP-шару.
- `client/` і `src/` не імпортують одне з одного і не мають спільного пакета — зв'язок лише
  через HTTP API (`VITE_API_URL`). Зміна домену (наприклад, нове значення `TOPICS`/`LEVELS`)
  вноситься вручну по обидва боки.
- `middleware/auth.ts` — єдине місце, де перевіряється JWT; захищені routes підключають його
  явно, а не покладаються на глобальний guard.

Причина такого поділу: AI-провайдер і Mongoose — обидва зовнішні залежності, яких хочеться
торкатися з одного місця кожна (`ai.service.ts`, `models/`), щоб заміна SDK чи БД не
розповзалася по контролерах.
