# Story: slugify

## Контекст

Потрібна функція `slugify(text)`, що перетворює довільний рядок у kebab-case
слаг, придатний для URL.

## Acceptance Criteria (Given/When/Then)

- Given рядок `"Hello World"`, When викликано `slugify`, Then результат `"hello-world"`.
- Given рядок із зайвими пробілами `"  Multiple   Spaces  "`, When `slugify`,
  Then результат `"multiple-spaces"`.
- Given рядок із пунктуацією `"C'est la vie!"`, When `slugify`,
  Then результат `"c-est-la-vie"` (небуквено-цифрові символи замінюються на
  `-`, послідовні `-` згортаються в один, крайні `-` відсікаються).
- Given порожній рядок `""`, When `slugify`, Then результат `""`.

## Definition of Done

- `node --test` зелений на HEAD.
- Рівно 3 атомарні коміти в порядку `test(slug)` -> `feat(slug)` -> `refactor(slug)`.
- Тести в `test/` не змінювались після фази RED.
