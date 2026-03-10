# CLAUDE.md

## Rules

- Always use **bun**, never npm/yarn.
- Never use `console.log` in the API — use the injected Pino logger.
- Never hard-delete synced Clerk data. All entity tables use soft deletes (`deleted_at` column).
- Use `class-validator` decorators on DTOs for validation.
- All services should used TDD before implementing proper business logic.
- use context7 MCP for researching and finding the latest developer documentation.
- The Clerk middleware file is `apps/frontend/proxy.ts` — **never rename it to `middleware.ts`**. This is the correct convention per Clerk docs.

## Testing

Run API tests with `cd apps/api && bun run test` (invokes **jest** via package.json script). **Never use `bun test` directly** — bun's native test runner does not emit decorator metadata (`emitDecoratorMetadata`), which breaks NestJS dependency injection (all injected services become `undefined`).

## Architecture

Turborepo monorepo: `apps/api` (NestJS), `apps/frontend` (Next.js + Clerk), `packages/shared`.

## Critical Gotcha: Shared Types

When you modify a Drizzle schema column in `apps/api/src/database/schema/`, you **must** also update the corresponding type in `packages/shared/src/database.ts`. These types are manually defined because shared builds before api in the Turbo pipeline.
