# Clerk Webhook Integration Backlog

## Overview

Fieldrunner syncs Clerk-managed entities (users, organizations, memberships, invitations, domains, roles, and permissions) to a local PostgreSQL database via Clerk webhook events. When Clerk fires an event (e.g., `user.created`), a signed POST request hits the API's `/webhooks` endpoint, is verified, logged, and dispatched to the appropriate entity handler. Each handler performs an idempotent upsert into the corresponding Drizzle schema table, keeping the local database in lockstep with Clerk as the source of truth.

---

## Implemented (Core -- Phase 1)

### Webhook Infrastructure

- **POST `/webhooks` endpoint** -- A dedicated NestJS controller receives all incoming Clerk webhook events at a single route. The endpoint is decorated with `@Public()` so it bypasses the `ClerkAuthGuard`, since Clerk's servers are the caller, not an authenticated user.
- **Svix signature verification** -- Every incoming request is verified against the `CLERK_WEBHOOK_SIGNING_SECRET` using Svix's `Webhook` class. The raw request body (preserved via `rawBody` support) and the `svix-id`, `svix-timestamp`, and `svix-signature` headers are checked to ensure the payload is authentic and has not been tampered with.
- **`webhook_events` log table** -- Every received event is inserted into the `webhook_events` table before processing. The table stores the Clerk event ID (unique constraint for deduplication), event type, raw JSON payload, processing timestamp, and any error message. This provides a complete audit trail for debugging and enables replaying events if a handler fails.
- **Event dispatch with structured error handling** -- After logging and verification, the controller dispatches the event to the appropriate entity handler based on the event type prefix (e.g., `user.*` routes to the user handler). If a handler throws, the error is captured in the `webhook_events` row and a non-retryable response is returned to prevent Clerk from re-sending the same failing event indefinitely.
- **rawBody support** -- The NestJS application is configured to preserve the raw request body on incoming requests. This is required because Svix signature verification must run against the exact bytes Clerk sent, not a parsed-and-reserialized JSON string.

### Entity Handlers -- Users

- **Events handled:** `user.created`, `user.updated`, `user.deleted`
- **Upsert strategy:** Idempotent INSERT ON CONFLICT on `clerk_id` with DO UPDATE, so receiving the same event twice produces the same result.
- **Soft delete:** The `user.deleted` event sets `deleted_at` to the current timestamp. The row is never hard-deleted, preserving referential integrity and enabling audit history.
- **Payload mapper:** Transforms the Clerk webhook payload from snake_case field names to the camelCase column names used in the Drizzle schema.
- **Fields synced:** `firstName`, `lastName`, `email`, `username`, `imageUrl`, `hasImage`, `passwordEnabled`, `twoFactorEnabled`, `banned`, `locked`, `externalId`, `publicMetadata`, `privateMetadata`, `unsafeMetadata`, `lastSignInAt`, `lastActiveAt`

### Entity Handlers -- Organizations

- **Events handled:** `organization.created`, `organization.updated`, `organization.deleted`
- **Upsert strategy:** Idempotent INSERT ON CONFLICT on `clerk_id` with DO UPDATE.
- **Soft delete:** The `organization.deleted` event sets `deleted_at`. The row is never hard-deleted.
- **Payload mapper:** Transforms Clerk snake_case to Drizzle camelCase.
- **Fields synced:** `name`, `slug`, `imageUrl`, `hasImage`, `createdBy`, `maxAllowedMemberships`, `membersCount`, `pendingInvitationsCount`, `adminDeleteEnabled`, `publicMetadata`, `privateMetadata`

### Entity Handlers -- Organization Memberships

- **Events handled:** `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
- **Upsert strategy:** Idempotent INSERT ON CONFLICT on `clerk_id` with DO UPDATE.
- **FK lookup:** The Clerk payload references the organization and user by their Clerk IDs. The handler queries the local `organizations` and `users` tables by `clerk_id` to resolve the internal UUID foreign keys (`organization_id`, `user_id`) before inserting.
- **Soft delete:** The `organizationMembership.deleted` event sets `deleted_at`. The row is never hard-deleted.
- **Payload mapper:** Transforms Clerk snake_case to Drizzle camelCase.
- **Fields synced:** `role`, `roleName`, `permissions`, `publicMetadata`, `privateMetadata`

### Testing

- **Payload mapper unit tests** -- Each entity's payload mapper function has unit tests verifying correct field mapping from Clerk's snake_case format to the Drizzle camelCase schema, including edge cases like null/undefined optional fields and JSONB metadata.
- **Verification logic unit tests** -- Tests covering Svix signature verification, including valid signatures, invalid signatures, missing headers, and expired timestamps.
- **E2E webhook endpoint test** -- An end-to-end test that sends a mocked Clerk webhook payload to POST `/webhooks`, verifying the full flow from signature verification through event logging and entity upsert.
- **Test fixtures** -- Realistic Clerk webhook payload structures for each supported event type, matching the actual shape Clerk sends in production.

---

## Pending (Phase 2+)

### Organization Invitations

- **Events:** `organizationInvitation.created`, `organizationInvitation.accepted`, `organizationInvitation.revoked`
- **Table:** `organization_invitations` (schema already defined with FK references to `organizations` and `users`)
- **Notes:** The `userId` foreign key is only populated when the invitation is accepted -- on the `created` event it will be null. The `status` column tracks the invitation lifecycle (`pending`, `accepted`, `revoked`). The handler must resolve the `organizationId` FK via `clerk_id` lookup, same as the membership handler. On `revoked`, set `deleted_at` for soft delete.

### Organization Domains

- **Events:** `organizationDomain.created`, `organizationDomain.updated`, `organizationDomain.deleted`
- **Table:** `organization_domains` (schema already defined with FK reference to `organizations`)
- **Notes:** The `verification` column is JSONB to accommodate Clerk's flexible verification data structure, which may include strategy, status, and external verification details. The handler must resolve the `organizationId` FK via `clerk_id` lookup. Additional fields to sync include `enrollmentMode`, `affiliationEmailAddress`, `totalPendingInvitations`, and `totalPendingSuggestions`. Soft delete on `organizationDomain.deleted`.

### Roles

- **Events:** `role.created`, `role.updated`, `role.deleted`
- **Table:** `roles` (schema already defined with unique constraints on `clerk_id` and `key`)
- **Notes:** The Clerk role webhook payload includes a nested `permissions` array. When processing a role event, the handler must not only upsert the role itself but also sync the `role_permissions` junction table to reflect the current set of permissions. This means diffing the existing junction entries against the incoming permissions array and inserting/removing as needed. Fields to sync: `key`, `name`, `description`, `isCreatorEligible`. Soft delete on `role.deleted`.

### Permissions

- **Events:** `permission.created`, `permission.updated`, `permission.deleted`
- **Table:** `permissions` (schema already defined with unique constraints on `clerk_id` and `key`)
- **Notes:** Straightforward upsert following the same pattern as users and organizations. Fields to sync: `key`, `name`, `description`, `type`. Soft delete on `permission.deleted`.

### Role-Permissions Junction Sync

- **Events:** No direct webhook -- derived from `role.*` events
- **Table:** `role_permissions` (composite primary key on `role_id` + `permission_id`, no `clerk_id` or timestamps)
- **Notes:** When a role event arrives with a `permissions` array, the handler should: (1) resolve each permission's Clerk ID to the internal UUID via `clerk_id` lookup on the `permissions` table, (2) query the current `role_permissions` entries for the role, (3) diff the two sets, (4) delete removed entries and insert new ones. This must happen atomically within the same transaction as the role upsert to avoid inconsistent state.

---

## Implementation Notes

- **Idempotent upserts** -- All handlers use `INSERT ... ON CONFLICT (clerk_id) DO UPDATE SET ...` so that duplicate deliveries or event replays produce the same database state. This is critical because Clerk does not guarantee exactly-once delivery.
- **Soft deletes only** -- Clerk-synced data is never hard-deleted. Every entity table includes a nullable `deleted_at` column. Delete events set this timestamp rather than removing the row. This preserves foreign key integrity and maintains a complete history.
- **Payload mappers** -- Each entity has a dedicated mapper function that transforms the Clerk webhook payload (snake_case) into the shape expected by the Drizzle schema (camelCase). Mappers also handle type coercion (e.g., Clerk timestamps as epoch milliseconds to JavaScript Date objects).
- **FK lookups** -- Entities with foreign key relationships (memberships, invitations, domains) must resolve Clerk IDs to internal UUIDs before inserting. This is done by querying the referenced table's `clerk_id` column. If the referenced entity does not yet exist locally (e.g., a membership event arrives before the user event), the handler should fail gracefully and rely on Clerk's retry mechanism to re-deliver the event after the dependency has been synced.
- **`webhook_events` table** -- Provides three capabilities: (1) deduplication via the unique `clerk_event_id` constraint, (2) debugging via the stored raw payload and error messages, and (3) replay capability by re-processing logged events through the dispatch pipeline.
- **Reference commands** -- Use the `clerk` and `clerk-webhooks` skills (available as `/clerk` and `/clerk-webhooks` slash commands) for reference when implementing new handlers.

---

## Environment Variables

| Variable                       | Description                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLERK_WEBHOOK_SIGNING_SECRET` | The Svix signing secret from the Clerk Dashboard (Webhooks section, per-endpoint settings). Used to verify that incoming webhook requests are authentic. |

---

## Local Development

1. **ngrok tunnel** -- Run ngrok to expose `localhost:3001` to the internet. Copy the generated HTTPS URL.
2. **Clerk Dashboard configuration** -- Navigate to Clerk Dashboard, then Webhooks, and add an endpoint pointing to `<ngrok-url>/webhooks`. Subscribe to all relevant event types. Copy the signing secret into your `.env` as `CLERK_WEBHOOK_SIGNING_SECRET`.
3. **Trigger test events** -- Use the Clerk Dashboard Webhooks Testing tab to send example payloads for each event type, or trigger real events by creating/updating/deleting users and organizations in the application.
4. **Verify processing** -- Check the `webhook_events` table in Drizzle Studio (`bun run db:studio` from `apps/api/`) to confirm events are being logged and processed. The `processed_at` column should be set and the `error` column should be null for successful events.
