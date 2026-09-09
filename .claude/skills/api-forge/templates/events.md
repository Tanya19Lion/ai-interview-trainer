---
status: Draft
owner: "<Backend Lead name>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: M
stage: "07"
ticket: "<ticket-id>"
---

# Events — <feature>

<!-- Stage 07 → see .claude/skills/api-forge/SKILL.md -->

## Topic / channel: `<topic-name>`

**Producer:** <service>
**Consumers:** <list>
**Delivery:** at-least-once | exactly-once
**Ordering:** key-based (by `<field>`) | none

## Event: `<event-name>` v<N>

```json
{
  "event_id": "<uuid>",
  "event_type": "<event-name>",
  "version": "<N>",
  "occurred_at": "<iso8601>",
  "data": {
    "<field>": "<type>"
  }
}
```

**Required fields:** `<...>`.
**Backwards compat policy:** additive-only (new optional fields are OK; remove / rename — new version).

## Schema registry
- Registry: <url / repo path>.
- Validator: <tool>.

## Replay / DLQ
- Retry: <N times, backoff>.
- DLQ topic: `<topic-name>.dlq`.