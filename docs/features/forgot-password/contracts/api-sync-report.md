---
status: Draft
owner: "Tanya19Lion"
updated_at: "2026-09-09"
stage: "10"
---

# API sync report — Forgot / Reset / Change Password

**Scenario: A** (typed contract). `docs/features/forgot-password/data-model.md` is present, so
every schema field below traces to an entity field in that document or to an explicit PRD/ADR
statement. `unresolved_origins` (Section C) is **empty**.

**Inputs read:**

| Input | Status | Effect |
|---|---|---|
| `PRD.md` | Found | US-01..05, AC-01..06 → 3 endpoints + all error branches |
| `data-model.md` | Found → scenario A | `User.email`, `User.tokenVersion`, `PasswordReset.{tokenHash,expiresAt}` typed the request/response schemas |
| `sad.md` §6 | Found, but **no `alt`/`else` blocks** in either sequence — both are single-path (happy path, Google edge case) | Error responses derived from PRD ACs instead of sequence `alt`-blocks (step 9 N/A here); flagged as a supporting-check caveat, not a blocker |
| `idea-brief.md` | Found | One-paragraph "why this API exists" folded into `info.description` |
| `adr/0001-...` | Found | Confirms `PasswordReset` is a separate collection, atomic `findOneAndDelete` consume → shaped the `password_reset.invalid_or_expired` error (no separate "already used" vs "expired" code, matching ADR-0001's "absence of the document is the signal") |
| `adr/0002-...` | Found | Confirms `tokenVersion` bump on both reset-confirm and change-password — noted in both endpoint descriptions |
| Existing `contracts/openapi.yaml` | Not found | Initial run — full generation, not an update |

## Section A — field origins table

| operation | schema_field | origin | confidence |
|---|---|---|---|
| requestPasswordReset | `PasswordResetRequestInput.email` | `data-model.md` → `User.email` | high |
| requestPasswordReset | `PasswordResetRequestResult.status` | PRD AC-02 + AC-05 (no literal data-model field — a response-shape decision) | medium |
| requestPasswordReset | `PasswordResetRequestResult.message` | PRD AC-02 + AC-05 (UX copy, not a stored field) | medium |
| confirmPasswordReset | `PasswordResetConfirmInput.token` | `data-model.md` → `PasswordReset.tokenHash` note ("sha256 hex of the raw emailed token" — token itself is the pre-image, never stored) | high |
| confirmPasswordReset | `PasswordResetConfirmInput.newPassword` | `data-model.md` → `User.passwordHash` (write target) + `PASSWORD_MIN_LENGTH = 8` in `src/controllers/auth.controller.ts` (PRD reference-module note) | high |
| changePassword | `ChangePasswordInput.currentPassword` | Compared against `User.passwordHash` via `bcrypt.compare` (existing `login` handler pattern) | high |
| changePassword | `ChangePasswordInput.newPassword` | Same as above | high |
| all three | `Error.code` values | PRD AC-02..06 + ADR-0001/0002 (see Section B, check 2) | medium — no sentinel constants exist yet (feature unimplemented) |

**Unused-in-PRD / orphan-sequence flags:** none. **Manual-addition flags:** none (initial run,
no prior `openapi.yaml` to diff against).

## Section B — drift findings (5-point)

1. **Endpoint ↔ data-model** — ✓. `requestPasswordReset`/`confirmPasswordReset` map to
   `PasswordReset` create/consume (`findOneAndDelete`, ADR-0001); `changePassword` and
   `confirmPasswordReset` both map to `User.passwordHash` write + `User.tokenVersion` increment.
2. **Error codes ↔ domain sentinels** — ✓ *(conditional)*. No sentinel-constants file exists in
   this codebase yet (`src/controllers/auth.controller.ts` currently uses inline
   `res.status(...).json({ error: 'string' })`, not a `{code, message}` shape at all — this
   feature is unimplemented, so there is nothing to diff against). Recommend introducing a small
   `src/constants/errors.ts` (or colocated in `passwordReset.service.ts`) at implementation time
   with exactly the `code` string literals used in this contract:
   `auth.validation_error`, `auth.incorrect_current_password`, `auth.google_account_no_password`,
   `auth.not_authenticated`, `password_reset.invalid_or_expired`, `password_reset.rate_limited`.
3. **Validation ↔ DB constraints** — ✓. `newPassword`/`currentPassword` `minLength: 8` matches
   the existing `PASSWORD_MIN_LENGTH` constant (not a DB-level constraint — Mongoose has none on
   `passwordHash` — but matches the one enforcement point that exists). `token` has no `maxLength`
   in the contract (it's the pre-image of `tokenHash`, not `tokenHash` itself, so `tokenHash`'s
   `maxlength: 64` doesn't directly bound it) — noted, not a defect.
4. **Entity ↔ endpoint** — ✓. `User` served by all three endpoints. `PasswordReset` served by
   `requestPasswordReset` (create) and `confirmPasswordReset` (consume) — never exposed directly
   (no `GET /password-resets`), which is correct: it's a write-only, internal-consumption
   collection, not a resource job-seekers list or browse.
5. **OpenAPI ↔ sequence** — ✓ *(with caveat)*. Both `sad.md` §6 sequences are container-level
   only (no HTTP method/path/status annotations, no `alt`-blocks) — they confirm the actor flow
   (`Client → API → PasswordResetService → DB → EmailProvider`) and the two branches
   (happy-path vs. Google-account) match `requestPasswordReset`'s two response variants, but there
   is nothing more granular to diff status codes against. Recommend running
   `complete-sequence-diagrams` for endpoint-level sequences per operation before implementation,
   to get a stricter check 5 next time this report is regenerated.

**Core checks (1-3): all ✓.** No blockers.

## Section C — unresolved_origins

Empty — scenario A, all fields trace to `data-model.md`, PRD, or an ADR.

## Deviations from skill defaults (human decision needed)

| Default | What this contract does instead | Why |
|---|---|---|
| `BearerAuth` (`Authorization` header) | `cookieAuth` (`apiKey`, `in: cookie`, name `token`) | `src/middleware/auth.ts`'s `requireAuth` reads the JWT from an httpOnly `token` cookie set by `issueSession()` — there is no `Authorization` header path anywhere in this codebase. Matching the skill's generic default here would describe an API that doesn't exist. |
| `Idempotency-Key` on mutating/retriable POST/PATCH | Not added | Skill defaults it in when a sequence shows a retry annotation (`Note over API, Worker: retry up to N`) — neither `sad.md` sequence has one, and this feature has no async worker/queue at all (email send is a direct synchronous call inside `passwordReset.service.ts`, SAD §4 point 3). Adding it would be speculative infrastructure not derived from any source artifact. **Flag for the human:** a double-submitted `requestPasswordReset` today would create two `PasswordReset` documents and send two emails — acceptable at current effort budget (SAD §2: S-size, single maintainer) but worth revisiting if abuse is observed. |
| Response shape uniformly hides existence (AC-02) | `requestPasswordReset`'s 200 body has two distinguishable variants (`sent` vs `google_account`) | This is not a contract defect — it is PRD AC-05's explicit, deliberate carve-out from AC-02's enumeration protection, already reasoned through in idea-brief §7 Approach C and PRD §6.1. Flagging here only so it isn't mistaken for an oversight in a later review. |
| Rate limit (429) scope | Applied only to registered Local-account emails, per `data-model.md`'s own inline comment ("flagged as open implementation question, not a schema gap" for unregistered emails) | Carried forward as-is from the source artifact rather than inventing a resolution the data model itself declined to commit to. **This does mean an unregistered email never gets a 429 while a registered one eventually does — a timing/status-code side channel not fully closed by AC-02.** Human should decide whether to close it (e.g. an IP-based limiter for the unregistered path) before implementation. |
| `events.md` (AsyncAPI) | Not generated | No async actors in this feature — `sad.md` §4 point 3 explicitly describes email delivery as a synchronous service-boundary call, not a queued/worker job. Nothing to model as an event. |

## Mock server

```
prism mock docs/features/forgot-password/contracts/openapi.yaml -p 4010
```

## Lint

Not yet run in this environment — recommend before commit:

```
spectral lint docs/features/forgot-password/contracts/openapi.yaml
```

## Self-check against DoD

- [x] Contract at `docs/features/forgot-password/contracts/openapi.yaml`
- [x] This report committed alongside it
- [x] Scenario recorded (A)
- [x] Core checks (1-3) all ✓
- [x] `unresolved_origins` empty (scenario A)
- [x] Examples on every operation (including error variants)
- [x] Error model `{code, message, details?}` throughout, snake_case codes, `<module>.<error_name>` namespacing
- [ ] Spectral lint — not run yet, see above
- [ ] Mock server — not brought up yet in this session
- [x] No async pieces in scope → `events.md` correctly omitted
- [x] 5 deviations from skill defaults explicitly recorded above (none silent)
