# 0002 — Деплой на Vercel: один проєкт для клієнта і API

## Status

Accepted

## Context

Репозиторій містить Express-сервер у корені та Vite-клієнт у `client/`. Деплоїти планується з
GitHub на Vercel. Vercel запускає бекенд як serverless-функції, а не як довгоживучий процес, тому
`app.listen()` у `src/index.ts` для нього непридатний. Клієнт за замовчуванням звертається до
відносного `/api`, а автентифікація тримається на httpOnly cookie з `sameSite: 'lax'`.

## Decision

- **Один проєкт Vercel**: статика з `client/dist` і функція `api/index.js` на одному домені;
  `vercel.json` спрямовує `/api/*` та `/health` на функцію, решту — на `index.html`.
- **Сервер розділено на `src/app.ts` (app без `listen`) і `src/index.ts` (локальний запуск).**
  Функція імпортує скомпільований `dist/app.js`, тож Vercel не залежить від власної обробки
  TypeScript/ESM.
- **MongoDB підключається один раз на інстанс функції** (кешований promise в `api/index.js`).
- **`trust proxy` = 1 лише коли `VERCEL` виставлено**, щоб `req.ip` у `ipRateLimit` був IP
  відвідувача.

## Consequences

- Same-origin: cookie `lax` працюють без змін, CORS не потрібен; альтернатива з двома доменами
  вимагала б `sameSite: 'none'` і ламалася б через блокування сторонніх cookie (Safari).
- Atlas доводиться відкривати для довільних IP (Vercel без фіксованих адрес) — захист тримається на
  паролі БД.
- Лічильники в пам'яті (`unregisteredEmailAttempts`) на serverless не діляться між інстансами.
- Довгі виклики Anthropic обмежені `maxDuration` функції та планом Vercel.
- Зміна хостингу (VPS, Render тощо) торкається лише `api/`, `vercel.json` і цієї ADR; `src/app.ts`
  лишається незмінним.
