---
name: tdd
description: TDD-orchestrator що проганяє повний Red-Green-Refactor цикл через 3 ізольовані agents, у будь-якому мовному/тестовому стеку. Використовуй коли користувач каже `/tdd <story-id>` (наприклад `/tdd story-24-sm2`), або «прогон TDD циклу на story X», «запусти TDD pipeline», «зроби RGR на цій story». Послідовно викликає tdd-test-writer → tdd-implementer → tdd-refactorer через Agent tool, з automatic gates між фазами. Підтримує опційний flag `--review-tests` для зупинки після RED і human review.
allowed-tools: Bash, Read, Agent
---

# tdd — orchestrator повного RGR циклу

Цей skill — диригент. Сам НЕ пише ні тестів, ні коду. Викликає 3 справжніх Claude Code agents (з `.claude/agents/`) через Agent tool, кожен у своєму isolated context. Між фазами виконує gates автоматично. На failure будь-якого гейту — STOP з actionable error.

Чому 3 окремі agents, а не 3 skill-виклики у одному контексті: skill виконується inline у тому самому context window головного агента. Agent tool створює окреме context window зі своїм system prompt. Тільки другий варіант дає реальний isolation, який лікує context pollution.

Цей skill НЕ прив'язаний до жодної мови чи test-runner'а. Перед Phase 1 він визначає стек проєкту (Detected stack) і передає ці параметри кожному subagent'у в prompt — subagent-и самі не вгадують команди.

## Inputs

З користувацького промпта витягни:
- `<story-id>` — обов'язково. Наприклад `story-24-sm2`. Має існувати файл `tasks/<story-id>.md`.
- `--review-tests` — опційний flag. Якщо є, після Phase 1 зупинитись і чекати на user input («continue» / «abort») перед запуском Phase 2.

## Pre-flight checks (виконати ПЕРЕД будь-якою фазою)

Виконай у Bash:

1. `git status --porcelain` — output має бути порожній.
   - Якщо ні: STOP з `Working tree not clean. Commit or stash changes before /tdd <story-id>.`
2. `test -f tasks/<story-id>.md && echo OK` — story-файл має існувати.
   - Якщо ні: STOP з `Story file tasks/<story-id>.md not found.`
3. `git rev-parse HEAD` — запам'ятай baseline SHA для фінального звіту.

### Detected stack

Визнач параметри проєкту один раз і передавай їх у кожен subagent-prompt та у кожен gate-command:

- `<TEST_CMD>` — команда запуску тестів. Пошук у порядку пріоритету: `package.json` → `scripts.test`; `Makefile` → ціль `test`; наявність `pytest.ini`/`pyproject.toml` з `[tool.pytest]` → `pytest -q`; `go.mod` → `go test ./...`; `Cargo.toml` → `cargo test`. Якщо кілька кандидатів або жодного — запитай користувача одним рядком, який test command використати, і зупинись до відповіді.
- `<TEST_DIR>` — де лежать тести проєкту (`tests/`, `test/`, `__tests__/`, `spec/`, colocated `*.test.*` / `*.spec.*` поряд з кодом). Визнач з наявної структури репо; якщо тестів ще немає — спитай користувача або йди за конвенцією `<TEST_DIR>`, зазначеною у CLAUDE.md/README проєкту.
- `<SRC_EXT>` — розширення файлів реалізації (`.ts`, `.py`, `.go`, `.rs`, ...), визнач з мови проєкту.
- Занеси ці три значення у кожен Agent-prompt нижче буквально (заміни `<TEST_CMD>`, `<TEST_DIR>`, `<SRC_EXT>` на визначені значення).

## Phase 1 — RED (tdd-test-writer)

Виклич Agent tool:

```
Agent(
  subagent_type="tdd-test-writer",
  description="RED phase: write failing tests for <story-id>",
  prompt="Story: <story-id>. Test command: <TEST_CMD>. Test directory: <TEST_DIR>. Read tasks/<story-id>.md and the project's conventions doc (CLAUDE.md/AGENTS.md/README), then follow your standard RED-phase workflow: resolve AC via your fallback chain (story AC section → story DoD/Scope → linked PRD), write failing tests in <TEST_DIR>, confirm red via <TEST_CMD>, commit with `test(<scope>): add failing tests per AC` (scope = domain prefix from story), output `RED phase commit: <SHA>`. If no AC is found anywhere in the chain, STOP and report that honestly instead of inventing AC. STOP after commit. Do not write implementation."
)
```

Дочекайся завершення. Розбери output:

- Якщо є рядок `RED phase commit: <SHA>` — запиши як `RED_SHA`, переходь до Gate 1.
- Якщо натомість agent повідомив `No acceptance criteria found in ...` (без коміту) — це НЕ помилка pipeline, а чесний сигнал про недостатню специфікацію. **STOP** тут, до Gate 1 не переходь, і виведи користувачу дослівне повідомлення agent'а разом з пропозицією: визначити AC у story-файлі (секція Acceptance Criteria чи Given/When/Then) або в пов'язаному PRD, і перезапустити `/tdd <story-id>`.

### Gate 1 — verify RED state

Виконай у Bash послідовно:

- `git log -1 --pretty=%s` — output має починатись з `test(`.
  - Якщо ні: STOP з `Phase 1 gate failed: last commit subject doesn't start with test(. Got: <subject>. SHA: <RED_SHA>.`
- `<TEST_CMD>; echo "EXIT:$?"` — exit code MUST be != 0 (тести мають падати).
  - Якщо EXIT:0: STOP з `Phase 1 gate failed: test command passes after RED phase. Tests don't actually verify new behavior — they pass on empty implementation. SHA: <RED_SHA>.`

Якщо `--review-tests` flag присутній: STOP з:
```
Phase 1 complete (RED). Review tests via `git show <RED_SHA>`.
To continue: run `/tdd <story-id>` again (will re-detect RED state and skip to Phase 2).
To abort: `git reset --hard <baseline-SHA>`.
```

(Зауваж: для auto-continue після review треба, щоб Pre-flight #1 не зашкодив. Один з варіантів — користувач каже «continue» одним рядком, і skill стартує безпосередньо з Phase 2 без re-run pre-flight. Альтернатива — повний re-run, який детектить останній commit як RED і пропускає Phase 1.)

## Phase 2 — GREEN (tdd-implementer)

Виклич Agent tool:

```
Agent(
  subagent_type="tdd-implementer",
  description="GREEN phase: implement <story-id> to make tests pass",
  prompt="Story: <story-id>. Test command: <TEST_CMD>. Test directory: <TEST_DIR> (read-only). Read the failing tests and the interface stub/signature they import. Follow your standard GREEN-phase workflow: write minimal monolithic implementation, drive <TEST_CMD> to green, commit with `feat(<scope>): implement to make tests pass`, output `GREEN phase commit: <SHA>`. STOP after commit. Do NOT modify any file under <TEST_DIR>."
)
```

Витягни `GREEN_SHA` з output.

### Gate 2 — verify GREEN state

Виконай у Bash:

- `git log -1 --pretty=%s` — output має починатись з `feat(`.
  - Якщо ні: STOP з `Phase 2 gate failed: last commit subject doesn't start with feat(. Got: <subject>. SHA: <GREEN_SHA>.`
- `<TEST_CMD>; echo "EXIT:$?"` — exit code MUST be 0.
  - Якщо ні: STOP з `Phase 2 gate failed: tests still red after implementer. SHA: <GREEN_SHA>.`
- `git diff --name-only HEAD~1 HEAD -- <TEST_DIR>` — output MUST be порожній (тести не торкалися).
  - Якщо непорожній: STOP з `Phase 2 gate failed: implementer modified <TEST_DIR>. Hard rule violated. Files changed: <files>. SHA: <GREEN_SHA>.`

## Phase 3 — REFACTOR (tdd-refactorer)

Виклич Agent tool:

```
Agent(
  subagent_type="tdd-refactorer",
  description="REFACTOR phase: extract helpers for <story-id>",
  prompt="Story: <story-id>. Test command: <TEST_CMD>. Test directory: <TEST_DIR> (strictly read-only). Refactor the implementation: extract at least 2 private/internal helpers based on natural branches per story rules, run <TEST_CMD> after each change. Commit with `refactor(<scope>): extract helpers`, output `REFACTOR phase commit: <SHA>` and a one-line list of the helper names you extracted. STOP after commit."
)
```

Витягни `REFACTOR_SHA` та список helper-імен з output.

### Gate 3 — verify REFACTOR state

Виконай у Bash:

- `git log -1 --pretty=%s` — output має починатись з `refactor(`.
  - Якщо ні: STOP з `Phase 3 gate failed: last commit subject doesn't start with refactor(. Got: <subject>. SHA: <REFACTOR_SHA>.`
- `<TEST_CMD>; echo "EXIT:$?"` — exit code MUST be 0.
  - Якщо ні: STOP з `Phase 3 gate failed: refactor broke tests. SHA: <REFACTOR_SHA>.`
- `git diff --name-only HEAD~1 HEAD -- <TEST_DIR>` — output MUST be порожній.
  - Якщо непорожній: STOP з `Phase 3 gate failed: refactorer modified <TEST_DIR>. SHA: <REFACTOR_SHA>. Files: <files>.`
- `git diff HEAD~1 HEAD -- '*<SRC_EXT>'` — переглянь diff і підтверди, що агент справді додав ≥2 нові функції/методи (незалежно від мовного синтаксису: `def`, `function`, `fn`, `func`, приватний метод класу тощо), а не просто перейменував чи додав коментарі. Порівняй з переліком helper-імен, які агент вивів у Phase 3.
  - Якщо < 2 нових helper-визначень: STOP з `Phase 3 gate failed: refactorer extracted only <n> helpers, expected ≥ 2. SHA: <REFACTOR_SHA>.`

## Final report

Виведи користувачу:

```
TDD pipeline complete for <story-id>.

Commits:
  RED      <RED_SHA>      test(<scope>): add failing tests per AC
  GREEN    <GREEN_SHA>    feat(<scope>): implement to make tests pass
  REFACTOR <REFACTOR_SHA> refactor(<scope>): extract helpers

Gates passed:
  ✓ Phase 1: tests red after test-writer, commit subject = test(
  ✓ Phase 2: tests green after implementer, <TEST_DIR> untouched
  ✓ Phase 3: tests green after refactorer, <TEST_DIR> untouched, ≥ 2 helpers extracted

Inspect: git log --oneline -3
Verify isolation: git diff HEAD~3 HEAD -- <TEST_DIR> (must be non-empty for RED phase only)
```

## Anti-patterns

- **Не виконуй фази inline.** Кожна фаза = окремий Agent tool call. Якщо пишеш тести сам у головному контексті — context pollution повернувся.
- **Не пропускай gates.** Gate 2 (`git diff -- <TEST_DIR>`) — критичний; без нього втрачаєш гарантію, що implementer не "виправив" тест.
- **Не намагайся "fix" failing agent.** Якщо agent не зміг закрити phase — це сигнал про story або стек. STOP, дай користувачу побачити helpful error. Pipeline не повинен "майже працювати".
- **Не амальгамуй commits.** 3 окремих commits — це observability layer. Squash-у не місце у цьому pipeline.
- **Не вгадуй test command.** Якщо Detected stack неоднозначний — питай користувача, а не пробуй навмання (провалений `<TEST_CMD>` ламає всі гейти однаково, хоч і без сенсу).

## Example invocations

```
User: /tdd story-24-sm2
You:  (визначити стек → pre-flight → Phase 1 via Agent → Gate 1 via Bash → Phase 2 → Gate 2 → Phase 3 → Gate 3 → final report)

User: /tdd story-24-sm2 --review-tests
You:  (те саме, але STOP після Gate 1 з review prompt)

User: /tdd story-99-broken-tests  (де тести виявились зеленими після test-writer)
You:  STOP з "Phase 1 gate failed: test command passes after RED phase..."
```