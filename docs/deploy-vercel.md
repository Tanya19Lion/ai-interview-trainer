# Деплой на Vercel

Один проєкт Vercel обслуговує і клієнт (статика з `client/dist`), і API (функція `api/index.js`)
на одному домені. Рішення та альтернативи — `docs/adr/0002-vercel-single-project.md`.

## Як це влаштовано

- `vercel.json`: збирає сервер (`npm run build` → `dist/`) і клієнт (`client/dist`), спрямовує
  `/api/*` та `/health` на функцію, решту шляхів — на `index.html` (SPA).
- `api/index.js` підключає MongoDB один раз на інстанс і передає запит в Express-app з `dist/app.js`.
- `src/app.ts` вмикає `trust proxy` лише коли Vercel виставив `VERCEL`, щоб `req.ip` був IP
  відвідувача (від нього залежить `ipRateLimit`).

## Кроки

1. **MongoDB Atlas → Network Access:** Vercel не має фіксованих IP, тож додайте `0.0.0.0/0`
   (з сильним паролем користувача БД) або скористайтеся Vercel-інтеграцією Atlas.
2. **Vercel → Add New → Project:** виберіть репозиторій. Root Directory — корінь репозиторію.
   Application Preset (раніше Framework Preset) — `Other`, а не `Express`, який Vercel може
   запропонувати сам: з `Express` клієнт не збереться. Команди беруться з `vercel.json`.
3. **Environment Variables** (Production і Preview):

   | Змінна | Значення |
   |---|---|
   | `MONGODB_URI` | рядок підключення Atlas |
   | `ANTHROPIC_API_KEY` | ключ Anthropic |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID (сервер) |
   | `VITE_GOOGLE_CLIENT_ID` | той самий client ID (клієнт, потрапляє у збірку) |
   | `JWT_SECRET` | довгий випадковий рядок |
   | `CLIENT_URL` | `https://<ваш-домен>.vercel.app` |

   **Не задавайте `VITE_API_URL`:** без нього клієнт ходить на `/api` свого ж домену, і cookie
   працюють без CORS.
4. **Google Cloud Console → Credentials:** додайте `https://<ваш-домен>.vercel.app` до Authorized
   JavaScript origins.
5. **Deploy**, потім перевірте у Preview: `GET /health` → `{"status":"ok"}`, вхід, старт сесії.

## Що перевірити після першого деплою

- `/health` і будь-який `/api/...` доходять до функції (rewrite у `vercel.json`).
- `maxDuration: 60` дозволено вашим планом Vercel; відповіді Anthropic можуть бути довгими.
- Ліміти IP працюють по відвідувачу, а не по Vercel (`trust proxy`).

## Відомі обмеження

- Лічильник `unregisteredEmailAttempts` у `passwordReset.service.ts` живе в пам'яті інстансу, а на
  serverless кожен інстанс має свій — його варто перенести в Mongo.
- Цей `vercel.json` не перевірявся на живому Vercel: порядок «build → функція» і збереження
  оригінального шляху після rewrite підтвердьте першим Preview-деплоєм.
