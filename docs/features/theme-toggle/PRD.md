---
status: Approved
owner: "Tanya19Lion"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-09-06"
feature_size: S
stage: "03"
ticket: "<TBD>"
---

# PRD — theme-toggle

> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](./CONTEXT.md)
> **Reference module:** `client/src/styles/tokens.css` + `.claude/rules/frontend/styles.md` — single design-token system; confirmed only a dark-first palette exists today (plus a separate "paper" set for code/diff cards) — no light palette and no theme-switch mechanism exist yet in the repo.
> **External context channels used:** None — only reference module code (beyond required inputs).

## 1. Context

Job-seekers who practice interviews in ai-interview-trainer currently have only one fixed visual mode — this is not a user complaint but an expected, standard SaaS/dev-tool feature for 2026, most noticeable during evening/late-night practice sessions. This is tied to the upcoming v1 release (~2026-10-05): all 10 tasks in the client plan are already shipped per PROGRESS.md, and theme-toggle is the natural next polish item before release. The accepted vector is Approach C (Toggle Plus Smart Default): a manual theme toggle with a remembered choice, plus a one-time read of the OS-level theme preference as the default on first visit, with no permanent real-time sync (idea-brief §13). Persistence stays device-local only — confirmed at the write-prd Socratic checkpoint (closes idea-brief §15 open question this way).

**Decision overrides:**
- Authorization coverage-type not applicable to theme-toggle — overridden by author, rationale: the feature has no roles or resource owners, so there is no authz boundary for an authorization-type AC to protect. (See §5 — no authorization AC is included; coverage gate closed with this deliberate exception.)

## 2. Goals

- Job-seeker switches themes with a single click, with no page reload.
- A new visitor's very first render already matches their OS-level theme preference, with no manual intervention.
- The chosen theme persists across sessions on the same device/browser.

## 3. Non-goals

- Continuous real-time sync with the OS theme during an active session — only a one-time read on first visit (idea-brief §6).
- Per-page/per-component theme overrides (idea-brief §6).
- Event tracking/analytics of toggle usage (idea-brief §6).
- Cross-device theme sync via user account — confirmed at the write-prd Socratic checkpoint: persistence stays device-local only (closes idea-brief §15).

## 4. User stories

### US-01: Switch theme manually

**As a** job-seeker
**I want** to switch between light and dark visual themes with a single click
**So that** I can practice comfortably regardless of ambient lighting

### US-02: See the app in the right theme from the first visit

**As a** job-seeker
**I want** the app to already match my OS theme preference the first time I open it
**So that** I don't have to manually switch it before I start

### US-03: Keep my theme choice across sessions

**As a** job-seeker
**I want** my manually chosen theme to be remembered on this device
**So that** I don't have to re-select it every time I return

### US-04: Switch theme without disrupting an active interview session

**As a** job-seeker
**I want** to switch themes mid-interview without losing my progress
**So that** a cosmetic change never costs me a timer or an in-progress answer

### US-05: Read AI feedback clearly in either theme

**As a** job-seeker
**I want** AI-generated feedback (text, code highlighting, strength/weakness badges) to stay readable in either theme
**So that** the most critical part of the product never becomes harder to use because of a cosmetic choice

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** a job-seeker is viewing the app in one theme
**When** the job-seeker activates the theme toggle
**Then** the system immediately switches to the alternate theme and remembers it as the active choice for this device

### AC-02 (US-03) — error / degraded input handling

**Given** a job-seeker's previously stored theme preference on this device is missing, corrupted, or unreadable
**When** the job-seeker opens the app
**Then** the system disregards the invalid value and falls back to the smart-default theme, without failing to load or showing a broken/unstyled interface

### AC-03 (US-01) — domain invariant: manual choice takes priority

**Given** a job-seeker has already made a manual theme choice on this device
**When** the operating system's theme preference later changes
**Then** the system keeps showing the job-seeker's manually chosen theme and does not silently revert to the new system default

### AC-04 (US-04) — cross-context: active interview session unaffected

**Given** a job-seeker is in the middle of an active interview session with a running timer and/or an in-flight answer submission
**When** the job-seeker switches the theme
**Then** the system applies the visual change without interrupting, resetting, or losing the timer state or the submission

### AC-05 (US-05) — domain invariant: feedback readability preserved

**Given** a job-seeker is viewing AI-generated interview feedback (text, code highlighting, strength/weakness badges)
**When** the active theme is either light or dark
**Then** all feedback content remains readable with sufficient visual contrast in both themes

### AC-06 (US-02) — happy path: first-visit smart default

**Given** a job-seeker opens the app for the very first time on a device, with no previously stored theme choice
**When** the app loads
**Then** the system reads the device/OS-level theme preference once and displays the app already in the matching theme

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Theme switch visual latency | ≤ 100 ms from click to full re-paint | manual QA / browser Performance API |
| Time to correct-theme first paint on cold load | ≤ 16 ms from load start to first visual paint already in the correct theme (one frame at 60fps; achievable via a lightweight inline theme-read script in `<head>`, no heavier anti-FOUC machinery needed) | manual QA / browser Performance API on cold load |
| Persistence accuracy | 100% of returning visits on the same device/browser correctly render the last manually chosen theme | manual QA / e2e test asserting re-render from localStorage |

## 6.1 Security / privacy

- **Data classification:** Internal — theme preference is not sensitive personal data, but it touches browser storage.
- **Personal data touched:** One new field — a locally stored theme-preference string (e.g. "light"/"dark") in browser storage; not sent to the backend, not linked to an account, not PII.
- **AuthZ/AuthN impact:** None — no new endpoints, no new authz checks; the behavior is identical for authenticated and unauthenticated visitors.
- **Abuse cases:**
  - **Cross-org access:** N/A — the app has no organizations/cross-org resource concept for this feature.
  - **Draft-leak:** N/A — no drafts concept applies to theming.
  - **Rapid-toggle spam:** a script could spam the toggle handler to force excessive re-renders/janky UI — mitigated by debouncing the toggle handler client-side (no server-side rate limit applies, since there is no request to rate-limit).
- **Security review:** N/A — S-size, purely client-side cosmetic feature, no new PII fields, no new authz boundaries, no new server endpoint.

## 7. Metrics / KPIs

- **Smart-default accuracy** — baseline: 100% of new sessions require a manual switch (no default exists today), target: <20% of new job-seeker sessions require a manual switch within the first 30 days after release (Approach C outcome metric, idea-brief §7).
- **Persistence reliability** — baseline: 0% (theming doesn't exist today), target: 100% of returning sessions on the same device correctly render the last chosen theme.
- **Feedback readability incidents** — baseline: TBD (no measurement exists — feature is new); baseline measurement plan: before release, run a manual QA contrast audit (WCAG AA) across both themes. Target: 0 reported readability issues with AI feedback in either theme within the first 30 days after release.

## 8. Open questions

- [ ] Хто власник accessibility/contrast-аудиту AI-фідбеку в обох темах (найкритичніший ризик idea-brief §10, перенесено з idea-brief §15)? — owner: Tech Lead, due: перед architecture-design
- [ ] Точні значення кольорів light-палітри (наразі в tokens.css лише dark-first + paper-акценти, перенесено з idea-brief §15) — owner: Tech Lead, due: architecture-design
- [ ] Чи ≤100ms (NFR "Theme switch visual latency") — реалістичний поріг, підтверджений окремим perf-вимірюванням, чи це лише евристична оцінка автора PRD? — owner: Tech Lead, due: перед architecture-design

## Related

- [idea-brief](./idea-brief.md), [CONTEXT](./CONTEXT.md)
- `client/src/styles/tokens.css`, `.claude/rules/frontend/styles.md` — existing design-token infrastructure referenced in §1.
