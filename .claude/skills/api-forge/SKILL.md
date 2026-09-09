---
name: api-forge
description: >
  Use when user wants to generate API contract (OpenAPI 3.1 / GraphQL / async events)
  per SDLC stage 07 (api-contracts) protocol. Triggers on "api-forge for {slug}",
  "API for {slug}", "openapi for {feature}", "GraphQL schema", "AsyncAPI",
  "events for {feature}", "stage 07 for {slug}", "/api-forge {slug}".
  Output: docs/features/{slug}/contracts/openapi.yaml + docs/features/{slug}/contracts/api-sync-report.md
  + contracts/events.md (if async).
  Hard gate: docs/features/{slug}/PRD.md (stage 03). data-model.md (stage 06)
  is recommended but optional — without it the skill runs in scenario B
  (PRD + sequences only) and fills `unresolved_origins` in the sync report.
  Renamed from `define-api` in v3.3.0; the legacy name is kept as a deprecation wrapper.
---

# Skill: api-forge (SDLC stage 07)

Generator of API contract: **OpenAPI 3.1** for synchronous HTTP APIs (the default, most complete path) or **GraphQL SDL** when the target project already speaks GraphQL or explicitly asks for it, + AsyncAPI / events.md for events. Clear error model (`{code, message, details?}`), cursor pagination, URL versioning, BearerAuth defaults — all of which are the *starting* defaults, overridden by whatever the target project's own codebase already does (see step 5, Project convention detection). The contract is **never written by hand** — it is the deterministic output of reading the source-of-truth artifacts (`data-model.md`, sequence diagrams, PRD §4) and projecting them into the chosen contract format. Produces `docs/features/<slug>/contracts/openapi.yaml` (or `schema.graphql`) + `docs/features/<slug>/contracts/api-sync-report.md`.

This is the **stage 07 runner**: contract is locked before FE / consumer side starts integration. Mock server (Prism / Postman) is brought up from the contract. The same contract feeds BE codegen (`oapi-codegen`, `openapi-generator`) and FE codegen (`openapi-typescript`, `openapi-fetch`) so both sides share a single source of types.

## Owner

Backend Lead.

## When to use

- "API for <slug>", "api-forge for <slug>", "openapi for <feature>", "GraphQL for <feature>", "events for <feature>", "run stage 07".
- User has PRD (data-model optional) and wants to lock the interface before handlers.
- `/api-forge <slug>` as explicit invocation.
- `/api-forge <slug> --reconcile` when `data-model.md` arrives after a scenario-B run.
- Skip if the contract file (`openapi.yaml` or `schema.graphql`) exists, passed lint (spectral / graphql-inspector), AND api-sync-report.md core checks all ✓.

## Inputs

- `<slug>` — same as for PRD / data-model.
- **Hard gate (refuse if missing):** `docs/features/<slug>/PRD.md`. If missing — STOP, suggest `sdlc:write-prd`.
- **Recommended (auto-detected; their presence determines scenario A vs B):**
  - `docs/features/<slug>/data-model.md` — strongest source of typed fields and constraints. Presence triggers scenario A (typed contract). Absence triggers scenario B (PRD/sequence-derived contract with `unresolved_origins` block).
  - `docs/features/<slug>/sad.md` §6 — both container-level sequences AND endpoint-level sequences embedded under `### US-N: <title>` (or `### Endpoint-level: <method path>`) headings. Default output of `complete-sequence-diagrams` (both coverage-audit and single-flow modes are inline). Parse all Mermaid `sequenceDiagram` blocks: container-level identifies async actors (Worker, Scheduler, External) so endpoints get `Idempotency-Key`; endpoint-level `alt`-blocks become OpenAPI `responses` (see step 9).
- **Optional (auto-detected, enrich generation when present):**
  - `docs/features/<slug>/idea-brief.md` — feature motivation. Fills `info.description` with one-paragraph context ("why this API exists") so downstream consumers (other teams, AI) understand purpose, not just shape.
  - `docs/features/<slug>/adr/*.md` — architecture decisions on versioning, error format, authentication. Override skill defaults when present (e.g., ADR mandates header versioning → URL versioning default is overridden).
  - **Existing `contracts/openapi.yaml` or `contracts/schema.graphql`** — if present, the skill diffs and updates in place rather than overwriting whole-cloth.
  - **The target project's own codebase** — not a `docs/features/` artifact, but read directly (routes/controllers or resolvers, auth middleware, dependency manifest) to detect conventions already in force. This is what keeps the skill generic across projects instead of always imposing the Defaults table verbatim — see step 5, Project convention detection.

If any recommended/optional input is missing, the skill still generates a usable `openapi.yaml`. The `api-sync-report.md` flags which enrichment was skipped and why it would have helped (e.g., "no endpoint-level sequences found in sad.md §6 → error responses derived from PRD acceptance criteria only; may miss 403 not-owned branches").

## Scenarios A vs B

The skill detects scenario from inputs and tells the user which one it is running.

### Scenario A — data-model.md exists (preferred)

Contract is **derived** from the model. Every field has an `origin` in a typed entity. Constraints (`maxLength`, `pattern`, `enum`) trace back to whatever the project's actual persistence layer expresses constraints as — a SQL column definition (`varchar(N)`, `CHECK`, an `ENUM` type), a Mongoose/ODM schema option (`maxlength`, `required`, `enum`), or another store's equivalent; `data-model.md` is already stack-detected upstream (see `generate-data-model`'s SKILL.md), this skill just reads it. Error codes derive from constraints (e.g., a uniqueness constraint on two fields → `<entity>.duplicate_<field>`). `unresolved_origins` is **empty**.

Drift check (step 17) verifies field-by-field alignment. Drift in scenario A means model and contract disagree on form — human resolves which artifact is right.

### Scenario B — data-model.md missing (fallback)

Contract is **inferred** from PRD §4 acceptance criteria + sequence diagrams + SAD §6 namespacing. Types are less precise (`string` without `maxLength`, no enum patterns yet). Error codes derive from `alt`-blocks in sequences, not from constraints.

`unresolved_origins` lists every field whose origin is "inferred from PRD/sequence, needs confirmation when data-model.md arrives". This is **not an error** — it is **declared incompleteness**, visible to the team.

### Reconcile (`--reconcile` flag)

When `data-model.md` arrives after a scenario-B run, re-run the skill with `--reconcile`. It:

1. Re-reads inputs (now includes data-model.md).
2. Switches scenario B → A.
3. Tightens types: `string` becomes `string` + `maxLength` where the persistence model now defines a length constraint (however that project's store expresses it).
4. Promotes low-confidence origins to high.
5. Empties `unresolved_origins`.
6. Surfaces any field that **had** an inferred origin from PRD but **now disagrees** with the model — that is real drift, not stale incompleteness.

`--reconcile` is the **point of convergence** between two artifacts that lived independently.

## Defaults

The skill applies a fixed set of defaults — not invented per-feature, but agreed minimum drawn from public industry guidelines (see Sources of best practices below). The table below **is** the defaults baseline; if the project maintains its own `.claude/rules/openapi.md` with project-specific overrides, read it first and let it take precedence over this table. Deviations (from either source) are flagged in `api-sync-report.md` so the team makes deviation a conscious decision.

| Topic | Default | Rationale |
|---|---|---|
| OpenAPI version | `3.1.0` | JSON Schema 2020-12 reused by JSON validators; native webhooks; `nullable` via `type: [string, null]`. |
| Error response shape | `{code, message, details?}` snake_case — never a bare `{"error": "..."}` | Homogeneous FE handling; `code` gives machine rule "retry vs change request". |
| Error `code` namespacing | `<module>.<error_name>` | e.g. `<entity>.duplicate_<field>`, `<entity>.not_found` — domain-readable. |
| Pagination for list endpoints | Cursor (UUID v7), not offset | Stable pages under concurrent writes; stable context for AI consumer. |
| URL versioning | `/api/v1/...` — never `?v=2` | Simpler than header versioning; cacheable; version visible in path; query-param versioning is non-standard and breaks caching. |
| Authentication | `BearerAuth: type: http, scheme: bearer` global | Global default; public endpoints declare explicit `security: []`. |
| Idempotency | `Idempotency-Key` header, with TTL/retention — added only when a sequence shows a retry annotation for that endpoint, never speculatively | Prevents duplicate side-effects on network retry, without inventing infrastructure no source artifact asked for. |
| ID generation | UUID v7 in application, not in DB | Cursor pagination; client can predict ID before request (idempotency). |
| Validation in spec | `pattern` / `enum` / `maxLength` mandatory for bounded fields | Double safety: handler validates again, but contract + audit keep consistency with DB. |
| Schema reuse | `$ref` mandatory; inline schemas forbidden | Single source of truth per type — less drift between endpoints. |
| Forbidden | `nullable: true` (3.0 style), real PII in `example`, `additionalProperties: true` on response shapes | Style leak from 3.0; PII in Swagger UI; internal field leakage. |

When an ADR overrides a default (e.g., header versioning), the report records "deviation by ADR-NNNN" so the override is documented, not silent.

## Protocol

1. **Prereq check (hard).** `test -f docs/features/<slug>/PRD.md` → exit ≠ 0 = refuse with pointer to `sdlc:write-prd`. data-model.md absence is **not** a refusal — it switches to scenario B.
2. **Detect scenario.** Scenario A if `docs/features/<slug>/data-model.md` exists, B otherwise. Tell the user which scenario was detected and which inputs were found / missing.
3. **Read prereqs.** PRD (AC → endpoints + validation rules), data-model if A (resource shapes, types, constraints).
4. **Read optional inputs (auto-detect).** For each of `docs/features/<slug>/sad.md`, `docs/features/<slug>/idea-brief.md`, `docs/features/<slug>/adr/*.md`: if present, parse and surface a one-line "found" note. If absent, surface "skipped" with consequence note. Never refuse on absence — these are enrichments, not prerequisites.
5. **Detect the target project's real conventions, then pick style.** Before applying any Defaults-table default, scan the actual codebase this feature lives in — this is what keeps the skill reusable across different projects instead of always forcing one fixed opinion onto whatever is already there:
   - **API style already in use** — a `.graphql`/`.gql` schema file, or `graphql` / `apollo-server` / `type-graphql` / a GraphQL framework in the dependency manifest → the project already speaks GraphQL. Existing REST route/controller files, or an existing `openapi.yaml`/`swagger.json` → the project already speaks REST. Neither found (greenfield) — no signal either way, defaults apply.
   - **Auth mechanism actually used** — read the project's real auth middleware/guard to see how it authenticates a request today (`Authorization: Bearer` header, a session cookie, an API key header, mTLS, ...) instead of assuming the Defaults table's `BearerAuth`. Use whatever is real; record any override in `api-sync-report.md`'s Deviations section, never silently.
   - **Error-response shape already in use** — if endpoints already exist, read a couple of handlers/resolvers to see today's actual error shape. A mismatch with this skill's `{code, message, details?}` default is not something to silently normalize — flag it and ask the user whether new endpoints should adopt the default (recommended, contract-first) or match the existing shape (less churn, more consistency with the current surface).
   - **Versioning convention already in use** — URL-prefixed, header-based, or none yet.

   Then choose the contract format:
   - **GraphQL branch** — when GraphQL is already the project's style, or the user explicitly asked for GraphQL / a query-flexible API. Replaces steps 6-7 and 11-12 below (those are REST-specific: URL versioning, method+path endpoints, query-param cursor pagination) with the GraphQL-branch guidance further down. Steps 8-10, 13-19 still apply, adapted to GraphQL shapes as noted there.
   - **REST (OpenAPI 3.1) branch** — default when REST is already the project's style, nothing is detected (greenfield), or the user asked for a plain resource API. Continue with steps 6-19 as written.
   - **Ambiguous** (both styles coexist, or the user's phrasing doesn't disambiguate) — ask the user directly; don't guess which one a mixed or unclear codebase "really" wants.
6. **Copy templates.** Copy from `./templates/`:
   - `openapi.yaml` → `docs/features/<slug>/contracts/openapi.yaml` (or update in place if exists).
   - `events.md` → `docs/features/<slug>/contracts/events.md` (if async).
7. **Versioning.** Per the Defaults table (URL-based `/api/v1/...`), unless an ADR mandates otherwise.
8. **Endpoints per AC.** For each user-story AC — endpoint(s). Method + path + request schema + response schema + error responses. In scenario A, schema fields trace to data-model entity columns; in scenario B, schemas are derived from PRD field names + sequence message names.
9. **Generate error branches from `alt`-blocks (when sequences present).** For each endpoint covered by a Mermaid `sequenceDiagram` block inline under sad.md §6 (US-N container-level or `### Endpoint-level: <method path>` heading): parse the `alt … else … end` blocks and add a response entry per branch (e.g., `alt not found` → `404 <entity>.not_found`, `alt not owner` → `403 <entity>.not_owned`, `alt invalid state` → `409 <entity>.invalid_state`). This closes the typical PRD blind spot — PRD lists happy path + 2-3 errors; sequences exhaustively enumerate error branches including 403 not-owned, which PRD often omits.
10. **Error model.** Per the Defaults table's shape and namespacing. Map `code` to HTTP status: 4xx client-caused, 5xx server-caused.
11. **Idempotency.** Per the Defaults table — add `Idempotency-Key` (with TTL/retention) only where a sequence shows `Note over API, Worker: retry up to N` for that endpoint.
12. **Pagination.** Cursor-based for lists (`?after=&before=&limit=`) on UUID v7. Response wraps in `{items, has_next, has_prev, next_cursor}`. Offset — anti-pattern.
13. **Async events.** For each event: name (`<module>.<action>.<v>`), schema (JSON Schema or Avro), producer, consumers, retry / DLQ behavior. If sequences contain async `API->>Worker: enqueue` messages — derive the event list from those messages and pre-fill `events.md` payload skeletons.
14. **Examples.** Each operation — request example + 200/201 example + error example. Use placeholder PII (`<...>@example.test`, `+380 00 000 00 00`, `Test User`) — never real values.
15. **Lint.** Suggest running `spectral lint contracts/openapi.yaml` (or graphql-inspector). If not yet wired — add to `make sdlc-check`.
16. **Mock server.** Suggest bringing up Prism: `prism mock contracts/openapi.yaml`. FE / consumer must have an access point to the mock.
17. **Run drift check + write `api-sync-report.md`.** See "Drift check" section below for the full 5-point checklist and report structure.
18. **Self-check against DoD.** Lint pass, examples on all operations, error model with codes, mock server up, `api-sync-report.md` core checks (1–3) all ✓, scenario explicitly recorded.
19. **Propose commit.** `07: API contract for <slug> via api-forge` + next owner (Decision owner — review any new ADR raised during contract design, e.g. an auth-scheme or versioning override not already covered by an existing stage 04-05 ADR).

### Drift check (step 17 detail)

Compare the generated contract against all read artifacts. The report (`api-sync-report.md`) has
three sections:

**Section A — field origins table.** One row per `(operation, schema_field)` pair: `schema_path | origin | confidence`. `confidence: high` for scenario-A fields whose type matches the persistence model's own type for that field; `medium` for PRD-derived fields; `low` for fields inferred from sequence message names only.

**Section B — drift findings.** Five-point checklist (each ✓ or ✗ with one-line diagnostic on ✗):

1. **Endpoint ↔ data-model** — every endpoint maps to ≥1 query/mutation against an entity in `data-model.md` (e.g., a publish endpoint corresponds to a status-field write on the matching entity — however that write is expressed for the project's actual store: a SQL `UPDATE ... SET status = 'published'`, a Mongoose `findByIdAndUpdate`, etc.). In scenario B: every endpoint maps to a sequence (since model absent).
2. **Error codes ↔ domain sentinels** — every `code` in OpenAPI `ErrorResponse` has a sentinel constant in the project's own error-constants module (e.g. `domain/errors.go`, `src/constants/errors.ts`, `errors.py` — whatever the stack uses). In scenario A, sentinels typically derive from UNIQUE/NOT NULL constraints in the model. If the feature is unimplemented (contract precedes code), record this check as deferred to implementation time rather than failing it.
3. **Validation ↔ persistence constraints** — `maxLength`, `pattern`, `enum` in OpenAPI align with the equivalent constraint recorded in `data-model.md` for that field (a SQL `VARCHAR(N)`/`CHECK`/`UNIQUE`, a Mongoose `maxlength`/`enum`/`unique: true`, or whatever the project's store expresses constraints as) — falling back to app-level validation where the store itself enforces nothing (scenario A only; scenario B records "deferred to reconcile").
4. **Entity ↔ endpoint** — every entity in `data-model.md` is served by ≥1 endpoint, or explicitly noted as "intentionally internal" (e.g., an entity exposed only via a signed URL nested inside another payload, never its own endpoint). Scenario A only.
5. **OpenAPI ↔ sequence** — endpoint-level sequences inline у sad.md §6 use the same HTTP methods / paths / response codes as `openapi.yaml`. Mismatch usually means the sequence was drawn before OpenAPI was finalized and never updated.

**Core checks** (1, 2, 3) failing — surface as blocker to the user. **Supporting checks** (4, 5) failing — become follow-up items in the report.

**Section C — unresolved_origins.** Empty in scenario A. In scenario B — list of fields whose origin is "inferred from PRD/sequence, needs confirmation when data-model.md arrives". Each entry: `schema_path | current origin | what reconcile would tighten`.

### GraphQL branch (steps 6-7, 11-12 substitute)

Taken instead of steps 6-7 and 11-12 when step 5 selected GraphQL. Steps 8-10, 13-19 apply as
written, with "operation" read as "Query/Mutation field" and "endpoint" as "field":

- **Copy template.** `./templates/schema.graphql` → `docs/features/<slug>/contracts/schema.graphql`
  (or update in place if it exists) instead of `openapi.yaml`.
- **Fields per AC (replaces step 6's endpoints-per-AC).** One `Query`/`Mutation` field per
  user-story AC, named in the domain's own language (Invariants' stack-agnostic-naming rule
  applies here too) — not REST verbs (`publish<Resource>`, not `POST /<resource>s/{id}/publish`).
- **Error model (extends step 10, doesn't replace it).** Same `{code, message, details?}` shape,
  carried on `GraphQLError.extensions` (`extensions: { code: "<module>.<error_name>", details? }`)
  instead of in an HTTP response body — so FE error handling stays uniform whether a given
  feature's contract is REST or GraphQL.
- **Pagination (replaces step 12).** Relay-style cursor connections — `edges { cursor, node }`,
  `pageInfo { hasNextPage, hasPreviousPage, endCursor, startCursor }` — the GraphQL-native
  equivalent of the REST branch's cursor pagination. Offset-based pagination is still an
  anti-pattern here.
- **Versioning (replaces step 7).** No URL-versioning equivalent exists for a single GraphQL
  endpoint. Evolve the schema additive-only; mark retired fields `@deprecated(reason: "...")`
  instead of introducing a new schema version.
- **Lint (extends step 15).** Suggest `graphql-inspector validate` / `graphql-inspector diff`
  (against the previous committed `schema.graphql`) in place of `spectral`.
- **Mock server (extends step 16).** Suggest a schema-first GraphQL mock (e.g. `graphql-faker`, or
  Apollo Server's built-in mocking) in place of Prism, which is OpenAPI-only.
- **Drift check (extends step 17).** Same 5-point structure; substitute "resolver" for
  "controller/handler" in check 1, and "SDL field path" for "schema_path" in check 3.

## Modes

| Mode | Trigger | Behaviour |
|---|---|---|
| Initial run | `/api-forge <slug>` (no contract file exists yet) | Full generation. Writes the contract (`openapi.yaml` or `schema.graphql`, per step 5) + `api-sync-report.md` from scratch. |
| Update | `/api-forge <slug> --update` (after sources changed) | Re-reads inputs, regenerates the contract in-place. Preserves `info.version` (REST) / doesn't bump the schema in a breaking way (GraphQL). Reports diff in summary. |
| Reconcile | `/api-forge <slug> --reconcile` (after `data-model.md` arrives in scenario B) | See "Reconcile" under Scenarios A vs B above for the full 6-step behavior. |

## Invariants

- **Never invent fields.** If a field has no origin in any input, the skill refuses to add it and asks the user where it should come from.
- **Never silently drop fields.** If a field disappears from `data-model.md`, the skill keeps it in the YAML with a `# stale` comment and surfaces it in the report — human decides whether to remove from contract or restore in model.
- **Never edit sources.** Reads only. Modification of `data-model.md` / `prd.md` / sequences is the user's job.
- **Stack-agnostic schema names.** Schemas use the domain language from `data-model.md`, not Go/TS/Python idioms.
- **Never bump `info.version` silently.** The user bumps semver explicitly with a CHANGELOG entry.

## Conflicts — human in the loop

| Conflict | Skill action |
|---|---|
| Field in `data-model.md` with no story in PRD covering it | Add field to schema with a `# unused-in-prd` note in `api-sync-report.md`; ask user. |
| Sequence references operation that maps to no endpoint in the resulting contract | Add `# orphan-sequence` flag in report; ask user (forgotten endpoint? internal job?). |
| PRD validation rule contradicts the persistence-layer constraint (e.g., `maxLength 300` in PRD vs a 200-character limit recorded in `data-model.md`, however that limit is expressed) | Take the stricter value; flag both in report. Human resolves which artifact is wrong. |
| Existing contract file has fields not in any source | Keep them with a `# manual-addition` comment (or `"""manual-addition"""` doc-string for GraphQL); flag in report. |

If ≥3 flags appear in one run — pause, surface the list to the user, ask whether to continue or fix sources first.

## Definition of Done

- Contract committed at `docs/features/<slug>/contracts/openapi.yaml` (REST) or `schema.graphql` (GraphQL), per step 5's detection.
- `api-sync-report.md` committed alongside: scenario recorded, core checks (1–3) all ✓ or explicitly waived, `unresolved_origins` empty (A) or listed (B).
- Mock server up (Prism / Postman).
- FE / consumer sides know where to pull from.
- Spectral / graphql-inspector lint pass.

## Anti-patterns

Defaults-table violations (bare `{"error": ...}`, `?v=2`, `nullable: true`, PII in examples,
speculative Idempotency-Key) are covered by the Defaults table itself, not repeated here. This
list is for failure modes that aren't a single default's opposite:

- "Contract after code" — FE / consumer integrates against breaking changes. Contract-first.
- Idempotency "if you feel like it" for mutating + retriable endpoints that a sequence shows
  retrying. The Defaults table makes `Idempotency-Key` conditional on evidence, not optional once
  that evidence exists.
- Async events without schema. Subscriber dies on the first breaking change.
- Operations without examples. Lint passes, but implementer doesn't know what such a request actually means.
- Method names in sequence diagrams and in API are different. Onboarding engineer walks into a trap.
- **Drift check skipped because "the spec was just generated, of course it matches"**. The 5-point check exists precisely because generation can match PRD-as-read while diverging from data-model or sequences (different files, different humans wrote them). Always run drift; surfacing a clean 5/5 ✓ is cheap, surfacing a silent ✗ in prod is not.
- **Error responses derived only from PRD.** PRD typically lists happy path + 2-3 errors. Sequences exhaustively enumerate `alt` branches including 403 not-owned and concurrent-modification states. Skipping the sequence enrichment leaves blind spots.
- **Hiding scenario B as if it were complete.** Scenario B is a valid state, not a half-baked one. `unresolved_origins` must be visible. Pretending the contract is fully typed when it isn't sets the team up for a silent drift when the model arrives.

## Sources of best practices

Defaults applied by this skill are drawn from public industry guidelines, recorded here so the team knows where each rule came from and can argue with the source if they want to deviate.

| Source | Link | What we took |
|---|---|---|
| Microsoft REST API Guidelines | https://github.com/microsoft/api-guidelines | Error shape with machine-readable `code`, URL versioning, `BearerAuth` default |
| Google AIP (API Improvement Proposals) | https://google.aip.dev/ | Resource-oriented paths, snake_case field names, domain-namespaced error codes |
| Zalando RESTful API Guidelines | https://opensource.zalando.com/restful-api-guidelines/ | Cursor pagination via next-link, JSON-only responses, snake_case JSON |
| Stripe API Versioning | https://stripe.com/blog/api-versioning | URL versioning trade-offs, deprecation strategy, backwards-compat over 10+ years |
| Swagger «What is API-First?» | https://swagger.io/resources/articles/adopting-an-api-first-approach/ | Canonical definition of API-first methodology |
| OpenAPI 3.1 specification | https://spec.openapis.org/oas/v3.1.0 | Full JSON Schema 2020-12 compatibility |

## Template

→ [./templates/openapi.yaml](./templates/openapi.yaml) — REST branch
→ [./templates/schema.graphql](./templates/schema.graphql) — GraphQL branch
→ [./templates/events.md](./templates/events.md) — async events, either branch

## Example invocation

> **User:** `/api-forge <slug>`
>
> **Skill behavior** (numbered to match the Protocol steps above exactly):
> 1. Prereq check: `test -f docs/features/<slug>/PRD.md` → OK.
> 2. Detect scenario: `test -f data-model.md` → OK → **scenario A**.
> 3. Read prereqs — PRD §4 user stories: US-1 create\<Resource\>, US-2 list\<Resource\>s, US-3 get\<Resource\>, US-4 add\<SubResource\>, US-5 publish\<Resource\>. data-model.md: entity `<resource>` with `id` (generated identifier), `<parent>_id` (reference to the parent entity, required), `title` (string, required, max length 200), `slug` (string, required, max length 80), `<numeric_field>` (number, 5-240), `<enum_field>` (enum: a|b|c), and a uniqueness constraint on `(<parent>_id, slug)` — recorded however this project's actual persistence layer expresses it (SQL DDL, a Mongoose schema, etc.).
> 4. Auto-detect optional inputs:
>    - `sad.md` §6 → found (3 container-level US-NN sequences with async actor `<worker>` + 2 inline endpoint-level sequences for `POST /<resource>s` create-flow and `POST /<resource>s/{id}/publish` publish-flow with alt-blocks: not_found, not_owned, invalid_state, slug_conflict).
>    - `idea-brief.md` → found (one-paragraph "why this API" goes into `info.description`).
>    - `adr/0001-<topic>.md` → found (referenced in `info.description`).
> 5. Detect project conventions, then pick style: existing route/controller files → REST already in use; auth middleware reads an `Authorization: Bearer` header → matches the `BearerAuth` default as-is; no endpoints exist yet, so no existing error shape to reconcile against. Style: REST (OpenAPI 3.1).
> 6. Copy templates → `docs/features/<slug>/contracts/openapi.yaml` + `events.md`.
> 7. Versioning: `/api/v1/...` URL-based.
> 8. Endpoints from US: 5 endpoints (POST /\<resource\>s, GET /\<resource\>s, GET /\<resource\>s/{id}, POST /\<resource\>s/{id}/\<sub-resources\>, POST /\<resource\>s/{id}/publish).
> 9. **Error branches from sequences:** sad.md §6 endpoint-level for `publish<Resource>` alt-blocks → 404 \<resource\>.not_found, 403 \<resource\>.not_owned, 409 \<resource\>.invalid_state. Endpoint-level for `create<Resource>` alt → 409 \<resource\>.duplicate_slug. PRD did not list 403; sequence enrichment caught it.
> 10. Error model: `{code, message, details?}` snake_case. Domain sentinels mapped from `data-model.md` invariants.
> 11. Idempotency: POST /\<resource\>s/{id}/publish — `Idempotency-Key` mandatory (sequence shows retry note on this endpoint).
> 12. Pagination: GET /\<resource\>s?after=&limit= (cursor UUID v7).
> 13. Events from `API->><worker>: enqueue` in sequences → `events.md` skeleton with `<resource>.created.v1`, `<resource>.published.v1`.
> 14. Examples on every operation.
> 15. Lint: spectral lint pass.
> 16. Mock: `prism mock contracts/openapi.yaml -p 4010`.
> 17. **Drift check + `api-sync-report.md`** — scenario A, field origins table (12 rows: 9 `high`, 3 `medium`), drift findings:
>     1. Endpoint ↔ data-model ✓
>     2. Error codes ↔ domain sentinels ✓ (4 codes, 4 sentinels in the project's own error-constants module)
>     3. Validation ↔ persistence constraints ✓ (title maxLength 200 matches the 200-char limit recorded in data-model.md; slug pattern has no store-level equivalent, intentionally left to app validation)
>     4. Entity ↔ endpoint ✓ with note: `<internal_entity>` exposed only via a signed URL nested in another payload (by design, ADR-0001)
>     5. OpenAPI ↔ sequence ✓ (all sequence HTTP codes match spec)
>     Unresolved origins: empty (scenario A).
> 18. Self-check DoD → all green.
> 19. Commit: `07: API contract for <slug> via api-forge`.
>
> (This walkthrough picked the REST branch at step 5. For a GraphQL-detected or ambiguous-style
> run, see the GraphQL branch section and step 5's "Ambiguous" bullet — the decision point is the
> same, only the downstream mechanics differ.)