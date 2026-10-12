# ADR-0001: Identifier strategy — Mongo native `_id`

## Status

Accepted

## Context

Потрібна стратегія ідентифікаторів для всіх сутностей (User, InterviewSession).

## Decision

Використовувати Mongo-native `_id` (`ObjectId`) усюди. Жодних app-generated UUID.

## Consequences

- Простіше: Mongoose генерує `_id` сам, нема окремого шару генерації.
- Прив'язує проєкт до MongoDB як до джерела ідентичності.
