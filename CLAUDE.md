# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

Package manager: **Bun** (v1.2.18). Always use `bun` instead of `npm`/`yarn`.

```bash
# All apps (from root, uses Turbo)
bun run dev          # Start all dev servers concurrently
bun run build        # Build all packages
bun run lint         # Lint all packages
bun run test         # Test all packages
bun run format       # Prettier format everything

# API only (from apps/api/)
bun run dev          # NestJS watch mode
bun run test         # Jest unit tests
bun run test:watch   # Jest watch mode
bun run test:e2e     # E2E tests (uses test/jest-e2e.json)
bun run test:cov     # Coverage report
bun run lint         # ESLint with auto-fix

# Frontend only (from apps/frontend/)
bun run dev          # Next.js dev server
bun run build        # Next.js production build
bun run lint         # ESLint

# Shared package (from packages/shared/)
bun run build        # TypeScript compilation to dist/
bun run dev          # TypeScript watch mode
```

## Architecture

Turborepo monorepo with three workspace packages:

- **`apps/api`** — NestJS 11 backend (port 3001). Structured logging via nestjs-pino, Helmet security headers, class-validator DTOs with global ValidationPipe (whitelist + forbidNonWhitelisted + transform). CORS configured via `CORS_ORIGINS` env var (defaults to `http://localhost:3000`).
- **`apps/frontend`** — Next.js 16 with App Router, React 19, Tailwind CSS v4, Clerk authentication. Uses Turbopack in dev. Path alias `@/*` maps to project root.
- **`packages/shared`** — Shared TypeScript utilities/types. ESM module, both apps depend on `@fieldrunner/shared` via `workspace:*`. Frontend transpiles it via `transpilePackages` in next.config.ts.

Turbo task dependencies: `build`, `lint`, and `test` all depend on `^build` (shared package builds first).

## Code Style

- Prettier: single quotes, trailing commas everywhere
- TypeScript: strict mode, ES2023 target, `nodenext` module resolution
- API uses flat ESLint config (`eslint.config.mjs`) with TypeScript + Prettier rules
- Frontend uses Next.js ESLint config with core web vitals

## API Conventions

- NestJS modular architecture. `ConfigModule` is global — inject `ConfigService` to read env vars.
- Logging: use the injected Pino logger, not `console.log`. Sensitive headers (auth, cookies) are auto-redacted.
- Validation: use `class-validator` decorators on DTOs. Zod is also available for schema validation.
- Available but not yet wired: `@nestjs/swagger`, `@nestjs/throttler`, `@nestjs/schedule`, `@nestjs/terminus`, `@nestjs/event-emitter`.
