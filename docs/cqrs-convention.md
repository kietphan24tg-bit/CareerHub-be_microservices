# CQRS Convention

## Current Scope

This project uses a light CQRS structure in:

- `iam-service`
- `candidate-service`
- `employer-service`

The current implementation does not use Nest `CommandBus` or `QueryBus`.

## Folder Shape

- `application/commands/<flow>/...`
- `application/queries/<flow>/...`

Each write flow should expose:

- `*.command.ts`
- `*.command-handler.ts`
- optional `*.result.ts`

Each read flow should expose:

- `*.query.ts`
- `*.query-handler.ts`

## Responsibility Split

- `CommandHandler` changes state and may write outbox records.
- `QueryHandler` reads state and must not perform write-side orchestration.
- transport controllers map HTTP/gRPC input to command/query handlers directly.

## Current Decision

- Keep public HTTP and gRPC contracts stable.
- Prefer direct handler injection over Nest CQRS framework ceremony for now.
- Add transaction and outbox concerns on the command side only when the flow needs them.
