# Conbiz Ticket Support — Project Overview

> This document is the authoritative entry point for any agent or developer working on this codebase.
> Read this before touching any code. Keep it in sync when making structural changes.

---

## What This App Is

A **client-facing ticket portal** built on top of [Linear](https://linear.app). It gives external clients (accounts) a read-friendly view of their support and project tickets managed internally in Linear. Admins manage accounts, boards, users, and release notes; viewers see only what they're granted access to.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.4 — App Router + Server Actions |
| UI | React 19, Tailwind CSS v4 |
| Database | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| External API | Linear GraphQL SDK v71 |
| Auth | Session-based (scrypt hashed passwords, httpOnly cookies) |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-sanitize` |
| Icons | `lucide-react` |
| Tests | Vitest |
| Deployment | Railway (RAILPACK builder) |
| Node | >= 22.12.0 |

---

## Repository Layout

```
conbiz-ticket-support/
├── app/                        # Next.js App Router
│   ├── actions/                # All server actions (data layer boundary)
│   │   ├── auth.ts             # login / logout
│   │   ├── boards.ts           # accounts + boards CRUD
│   │   ├── linear.ts           # Linear connection helpers
│   │   ├── portal.ts           # tickets, comments, activity
│   │   ├── releases.ts         # release notes lifecycle
│   │   ├── session.ts          # current user info
│   │   └── users.ts            # user CRUD
│   ├── api/
│   │   ├── webhooks/linear/    # POST — Linear webhook receiver
│   │   └── linear/file/        # GET  — authenticated file proxy
│   ├── portal/                 # Main portal (authenticated users)
│   │   ├── page.tsx
│   │   ├── portal-view.tsx
│   │   ├── _components/        # TicketTable, KanbanBoard, Drawer, etc.
│   │   ├── _hooks/             # Custom data/state hooks
│   │   ├── _utils/             # priority, state-order, markdown
│   │   ├── settings/           # Account + board management UI
│   │   └── releases/           # Release notes UI
│   ├── admin/
│   │   ├── users/              # User management (admin only)
│   │   └── linear-explorer/    # Linear debug tool (admin only)
│   ├── login/                  # Email/password login page
│   ├── layout.tsx
│   ├── page.tsx                # Redirects / → /portal
│   └── globals.css
├── lib/
│   ├── auth.ts                 # Session helpers, requireAuth, requireAdmin
│   ├── contracts/
│   │   └── portal.ts           # ActionResult<T>, shared DTOs
│   ├── linear.ts               # Linear SDK wrapper
│   ├── password.ts             # scrypt hash/verify
│   └── prisma.ts               # Prisma client singleton
├── prisma/
│   ├── schema.prisma           # Source of truth for all data models
│   └── migrations/             # PostgreSQL migration history
├── docs/                       # Operational docs and ADRs
├── agent-context/              # Agent/LLM onboarding context (this folder)
├── scripts/
│   └── railway-predeploy.sh    # Runs `prisma migrate deploy` before start
├── railway.toml                # Railway build/deploy config
└── package.json
```

---

## Database Schema

All models live in [prisma/schema.prisma](../prisma/schema.prisma). Below is a full description with relationships.

### Enums

```
UserRole      → ADMIN | VIEWER
BoardType     → SUPPORT | PROJECT
ReleaseStatus → DRAFT | PUBLISHED
```

### Models

#### `User`
Internal operator or viewer of the portal.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| email | String | Unique |
| name | String | |
| role | UserRole | Default: VIEWER |
| passwordHash | String? | scrypt hash, optional for legacy setups |
| isActive | Boolean | Default: true |
| linearCustomerId | String? | Links to Linear Customer entity |
| createdAt / updatedAt | DateTime | Auto-managed |

Relations: `sessions[]`, `boardAccess[]`, `releases[]`

#### `Account`
Represents a client organization.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| name | String | Unique |

Relations: `boards[]`, `releaseScopes[]` (via ReleaseAccount), `releaseItems[]`

#### `Board`
A ticket view tied to an Account and a Linear team/project.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| name | String | Display name |
| type | BoardType | SUPPORT or PROJECT |
| accountId | String | FK → Account |
| teamId | String | Linear team ID |
| projectId | String? | Linear project ID (optional filter) |

**Unique constraint: `(accountId, type)`** — one board per type per account.

Relations: `account`, `userAccess[]` (via UserBoardAccess)

#### `Session`
Authenticated user session.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| userId | String | FK → User |
| tokenHash | String | SHA-256 of the cookie token, unique |
| expiresAt | DateTime | 14-day TTL |

Index on `(userId, expiresAt)` for cleanup queries.

#### `UserBoardAccess`
Junction table granting VIEWER users access to specific boards.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| userId | String | FK → User |
| boardId | String | FK → Board |

**Unique constraint: `(userId, boardId)`**. ADMIN users bypass this table.

#### `Release`
A release note entry (changelog item).

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| title | String | |
| description | String | Markdown content |
| status | ReleaseStatus | DRAFT or PUBLISHED |
| publishedAt | DateTime? | Set when published |
| createdByUserId | String | FK → User (onDelete: Restrict) |

Index on `(status, publishedAt)` for timeline queries.

Relations: `accounts[]` (via ReleaseAccount), `items[]` (via ReleaseItem), `tagAssignments[]`

#### `ReleaseAccount`
Scopes a Release to one or more Accounts.

| Field | Type | Notes |
|---|---|---|
| releaseId | String | FK → Release |
| accountId | String | FK → Account |

**Unique constraint: `(releaseId, accountId)`**

#### `ReleaseItem`
A snapshot of a Linear ticket attached to a Release.

| Field | Type | Notes |
|---|---|---|
| releaseId | String | FK → Release |
| issueId | String | Linear issue ID |
| issueIdentifier | String | e.g. `ENG-123` |
| title | String | Snapshot at time of attachment |
| stateName | String | |
| stateType | String? | |
| priority | Int? | |
| boardType | BoardType | |
| accountId | String | Denormalized FK → Account |

**Unique constraint: `(releaseId, issueId)`**

#### `ReleaseTag`
Categorization label for releases.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| name | String | Display name |
| slug | String | Unique URL-safe identifier |

Relations: `releaseLinks[]` (via ReleaseTagAssignment)

#### `ReleaseTagAssignment`
Junction table linking Tags to Releases.

| Field | Type | Notes |
|---|---|---|
| releaseId | String | FK → Release |
| tagId | String | FK → ReleaseTag |

**Unique constraint: `(releaseId, tagId)`**

---

## Entity Relationship Diagram

```
User ─────────────── Session (1:N)
User ─────────────── UserBoardAccess (1:N)
User ─────────────── Release (1:N, as creator)

Account ──────────── Board (1:N)
Account ──────────── ReleaseAccount (1:N)
Account ──────────── ReleaseItem (1:N, denormalized)

Board ────────────── UserBoardAccess (1:N)

Release ──────────── ReleaseAccount (1:N)
Release ──────────── ReleaseItem (1:N)
Release ──────────── ReleaseTagAssignment (1:N)

ReleaseTag ───────── ReleaseTagAssignment (1:N)
```

---

## Authentication & Authorization

### Session Flow

1. User submits email + password at `/login`
2. `app/actions/auth.ts:login()` verifies password via scrypt (`lib/password.ts`)
3. On success: `lib/auth.ts:createUserSession()` generates a 32-byte random token, SHA-256 hashes it, stores in `Session` table, sends cookie `conbiz_session` (httpOnly, Secure in prod)
4. On each server action: `lib/auth.ts:getAuthContext()` reads cookie, verifies hash, returns `{ user, session }`
5. Sessions expire after 14 days; logout calls `clearUserSession()`

### Guards

- `requireAuth()` — enforces any valid session; used in all portal actions
- `requireAdmin()` — enforces `role === ADMIN`; used in mutations and admin-only reads

### Role-Based Access Control

| Role | Can do |
|---|---|
| ADMIN | Full access: all boards, all users, all releases, create tickets, write comments |
| VIEWER | See only boards where `UserBoardAccess` entry exists; read-only tickets; read-only releases |

### Auth Bypass (dev only)

`CONBIZ_AUTH_BYPASS=true` skips session validation. **Blocked when `NODE_ENV === production`.**

### Legacy Auth (fallback)

Headers `x-conbiz-user-id`, `x-conbiz-user-role`, `x-conbiz-user-email` — retained for backward compatibility with proxy setups.

---

## Core Features

### 1. Ticket Portal (`/portal`)

- Fetches tickets from Linear via `getBoardTickets()` server action
- Two views: **Table** and **Kanban** (toggleable)
- Boards toggled between `SUPPORT` and `PROJECT` per account
- Sorting by: `createdAt`, `updatedAt`, `priority`, `title`, `assignee`, `state`
- Ticket detail drawer: full description, comments, attachments
- Comments sent from portal are prefixed with `#sync` in Linear; only `#sync` comments are shown to portal viewers
- **New ticket creation** only available on SUPPORT boards

### 2. Recent Activity (`/portal` → activity popover)

- Polls `getRecentActivity()` with an incremental `since` timestamp
- Shows issue updates and `#sync` comments
- Adaptive polling interval (slows when tab is hidden)
- Seen state stored in `localStorage` per board

### 3. Settings (`/portal/settings`)

- Create/edit **Accounts** (client organizations)
- Create/edit **Boards** per account (linked to Linear team + optional project)
- One SUPPORT board and one PROJECT board per account maximum
- Assign boards to VIEWER users

### 4. Release Notes (`/portal/releases`)

- Admins create DRAFT releases with title, description (markdown), and account scope
- Attach Linear tickets as `ReleaseItem` snapshots
- Tag releases with `ReleaseTag` labels
- Publish releases → status becomes PUBLISHED, `publishedAt` set
- Viewers see a timeline of PUBLISHED releases for their accounts (cursor-based pagination)

### 5. Admin Panel (`/admin`)

- `/admin/users` — create, view, delete users; assign board access for VIEWERs
- `/admin/linear-explorer` — debug tool to browse Linear teams, projects, states, labels

---

## Server Actions

All server actions are in `app/actions/`. They follow the `ActionResult<T>` contract defined in `lib/contracts/portal.ts`.

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }
```

### `auth.ts`
- `login(email, password)` → creates session
- `logout()` → clears session

### `portal.ts`
- `getBoardTickets(boardId, cursor?)` → paginated Linear issues (up to 250)
- `getRecentActivity(boardId, since)` → delta feed of issue updates + `#sync` comments
- `getIssueDetails(issueId)` → full issue with comments + attachments
- `createIssueComment(issueId, body)` → posts `#sync`-prefixed comment (ADMIN only)

### `boards.ts`
- `getBoards()` → all boards (admins) or accessible boards (viewers)
- `getAccounts()` → all accounts
- `createAccount(name)` / `updateAccount(id, name)` → account CRUD
- `createBoard(data)` / `updateBoard(id, data)` → board CRUD (enforces unique type per account)

### `users.ts`
- `getUsers()` → all users (ADMIN only)
- `createUser(data)` → create with role + optional board access
- `deleteUser(id)` → remove user

### `releases.ts`
- `getReleaseTimeline(accountId, cursor?)` → published releases for account (paginated)
- `getReleaseDetails(releaseId)` → full release with items + tags
- `createReleaseDraft(data)` → new DRAFT release
- `updateRelease(id, data)` → edit title/description/accounts/tags
- `publishRelease(id)` → DRAFT → PUBLISHED
- `deleteReleaseDraft(id)` / `deleteRelease(id)` → delete release
- `getReleaseCandidateTickets(params)` → Linear issues eligible for release
- `attachReleaseItems(releaseId, items[])` → add ticket snapshots
- `detachReleaseItem(releaseId, issueId)` → remove ticket
- `upsertReleaseTag(data)` / `deleteReleaseTag(id)` → tag management
- `getReleaseTags()` → all tags

### `linear.ts`
- `checkConnection()`, `getTeams()`, `getProjects()`, `getLabels()`, `getWorkflowStates()`
- `findCustomer(email)`, `createCustomer(data)`

### `session.ts`
- `getSessionInfo()` → current user (id, name, email, role)

---

## API Routes

### `POST /api/webhooks/linear`
- Validates `linear-signature` header (HMAC-SHA256) and timestamp (60s window, replay prevention)
- Receives Linear event payloads
- Currently structured for event persistence (TODO: persist to activity feed)

### `GET /api/linear/file?url=<encoded>`
- Requires auth (`requireAuth()`)
- Validates hostname is `uploads.linear.app` (SSRF prevention)
- Proxies file with `LINEAR_API_KEY` authorization header
- Cache: 5 minutes

---

## Environment Variables

### Required

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
LINEAR_API_KEY="lin_api_..."
INITIAL_ADMIN_EMAIL="admin@example.com"
INITIAL_ADMIN_PASSWORD="strong-password-used-once"
```

### Optional

```bash
LINEAR_WEBHOOK_SECRET="lin_wh_..."         # Required for webhook validation
LINEAR_FILE_URL_EXPIRES_IN=300             # Signed URL expiry in seconds (default 300)
CONBIZ_AUTH_BYPASS=true                    # Dev only — bypasses session auth
NODE_ENV=production                        # Blocks auth bypass in production
RAILPACK_NODE_VERSION=22                   # Railway build node version
```

### Database URL Resolution Order (checked in `lib/prisma.ts`)

1. `DATABASE_URL`
2. `DATABASE_PRIVATE_URL`
3. `DATABASE_PUBLIC_URL`
4. `POSTGRES_URL`
5. `POSTGRES_PRISMA_URL`
6. Built from `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` / `PGSSLMODE`

### Bootstrap Admin

On first boot, if `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` are set and no users exist, the login action creates the first admin. These vars can be removed after the first login.

---

## Data Flow Diagrams

### Ticket Viewing

```
Browser → /portal
  → getSessionInfo()           (who am I?)
  → getBoards()                (which boards can I see?)
  → getBoardTickets(boardId)   (fetch from Linear GraphQL)
  → TicketTable / KanbanBoard  (render)
  → click ticket
  → getIssueDetails(issueId)   (fetch from Linear GraphQL)
  → TicketDetailsDrawer        (render with comments + attachments)
```

### Release Notes

```
Admin → createReleaseDraft()
  → getReleaseCandidateTickets()   (browse Linear for tickets)
  → attachReleaseItems()           (snapshot to ReleaseItem table)
  → publishRelease()               (status = PUBLISHED)

Viewer → getReleaseTimeline()      (cursor-paginated, filtered by account)
       → getReleaseDetails()       (items + tags)
```

### Linear Webhook

```
Linear → POST /api/webhooks/linear
  → Verify HMAC-SHA256 signature
  → Verify timestamp (±60s)
  → Process event (TODO: persist for activity)
  → 200 OK
```

---

## Security Notes

- Passwords: **scrypt**, 64-byte key, stored in `passwordHash`
- Sessions: 32-byte random token, SHA-256 hashed before DB storage
- Cookies: `httpOnly`, `Secure` in production, `SameSite=Lax`
- RBAC enforced in every server action — never trust client-provided role claims
- Webhook: HMAC-SHA256 + replay protection (60s window, constant-time compare)
- File proxy: strict hostname allowlist (`uploads.linear.app` only)
- Markdown: sanitized with `rehype-sanitize` (XSS prevention)
- Auth bypass: locked to `NODE_ENV !== production`

---

## Local Development Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up .env.local (see Environment Variables above)

# 3. Generate Prisma client
npm run db:generate

# 4. Apply migrations
npm run db:migrate:deploy

# 5. Start dev server
npm run dev
```

Key local routes:
- `http://localhost:3000/portal` — main portal
- `http://localhost:3000/portal/settings` — account/board management
- `http://localhost:3000/admin/users` — user management
- `http://localhost:3000/admin/linear-explorer` — Linear debug tool

---

## Deployment (Railway)

Managed by `railway.toml`:
- Builder: `RAILPACK`
- Build: `npm ci && npm run build` (includes `prisma generate`)
- Pre-deploy: `./scripts/railway-predeploy.sh` (runs `prisma migrate deploy`)
- Start: `npm run start`

See [docs/runbooks/deploy-railway.md](../docs/runbooks/deploy-railway.md) for full checklist.

---

## Key Conventions

- **Server actions return `ActionResult<T>`** — never throw raw errors to the client
- **DTOs defined in `lib/contracts/portal.ts`** — don't return raw Prisma types to UI
- **One board type per account** — enforced at DB level (`@@unique([accountId, type])`) and in action logic
- **`#sync` prefix** — all comments created from the portal include `#sync`; only `#sync` comments are shown to portal users
- **Cascading deletes** — deleting an Account cascades to Boards, UserBoardAccess, ReleaseAccounts, ReleaseItems; deleting a Release cascades to all its children
- **VIEWER access is explicit** — a VIEWER sees nothing unless `UserBoardAccess` rows exist for them

---

## Related Docs

- [docs/architecture-overview.md](../docs/architecture-overview.md) — Layer diagram and flow
- [docs/adr/ADR-001-portal-architecture.md](../docs/adr/ADR-001-portal-architecture.md) — Structural decisions
- [docs/runbooks/local-dev.md](../docs/runbooks/local-dev.md) — Local setup
- [docs/runbooks/deploy-railway.md](../docs/runbooks/deploy-railway.md) — Production deploy
- [docs/runbooks/linear-sync.md](../docs/runbooks/linear-sync.md) — Linear integration details
