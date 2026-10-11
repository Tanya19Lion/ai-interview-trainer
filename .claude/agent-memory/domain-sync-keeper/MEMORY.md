# Domain sync memory

## Свідомі винятки
- `User.passwordHash` тільки на server — секрет (bcrypt-хеш), ніколи не має потрапляти на client; підтвердила людина 2026-10-11

## Кандидати у винятки (НЕ підтверджено — спитати людину; станом на 2026-10-11 людина свідомо їх НЕ підтвердила)
- `InterviewSession.userId/lang/currentQuestion/createdAt/updatedAt` — тільки server, не віддаються в API-відповідях
- `User.googleId/tokenVersion` — тільки server; client бачить лише `AuthUser` {id,email,name,avatarUrl?} (`client/src/api/auth.ts`)
- `LoginAttempt`, `IpAttempt`, `PasswordReset`, `ResetRequestAttempt` — server-only колекції, на client немає відповідників

## Відкриті розбіжності
Код: немає (TOPICS/LEVELS/LANGS/status і response-shapes збігаються, перевірено 2026-10-11)

Документація (перевірено повторно 2026-10-11 — все ще відкрито):
- [2026-10-11] `docs/data-model.md` таблиця `InterviewSession.topic`: пише "9 values", у коді 10 (після `system-design`)
- [2026-10-11] `docs/data-model.md`: `User.tokenVersion` є в Schema-change log (2026-09-10), але відсутній в ER-діаграмі й таблиці User
- [2026-10-11] `docs/data-model.md`: `InterviewSession.lang` і `currentQuestion` відсутні в ER-діаграмі; `currentQuestion` відсутній і в таблиці полів
- [2026-10-11] `docs/data-model.md` QuestionAttempt: `answer`/`feedback` позначені `required`, а з 2026-10-04 це function-required (дозволяє `''`)
- [2026-10-11] `docs/data-model.md`: посилання "see Drift findings" веде в нікуди (секція є лише в `docs/_audit/*`); колекції `LoginAttempt`/`PasswordReset`/`IpAttempt`/`ResetRequestAttempt` є тільки в log, не в Entities/Indexes; frontmatter `updated_at: 2026-09-07` застарів

## Історія
- [2026-10-11] перший запуск; базова лінія: TOPICS(10)/LEVELS(3)/LANGS(2)/status збігаються; всі response-shapes контролерів збігаються з `client/src/types/*.ts` і `AuthUser`

