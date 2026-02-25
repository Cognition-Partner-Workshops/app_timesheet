# Technical Summary — Client Timesheet App

## Table of Contents

- [Overview](#overview)
- [Frontend](#frontend)
- [Backend](#backend)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Input Validation Schemas](#input-validation-schemas)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Environment Variables](#environment-variables)
- [Docker](#docker)
- [Known Limitations](#known-limitations)
- [Unit Test Coverage](#unit-test-coverage)

---

## Overview

Full-stack web application for tracking and reporting employee hourly work across different clients.

- **Frontend**: React 19 + TypeScript, built with Vite, served at `http://localhost:5173` in development.
- **Backend**: Node.js + Express 4, running at `http://localhost:3001` by default.
- **Database**: SQLite in-memory (`:memory:`) — all data is lost on server restart.

---

## Frontend

> Located in `frontend/`

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite (`frontend/vite.config.ts`) — proxies `/api` requests to `http://localhost:3001`
- **UI Library**: Material UI (`@mui/material` ^7.3.6)
- **State Management**: TanStack React Query (`@tanstack/react-query` ^5.90.11) for server state; Context API for auth
- **Routing**: React Router v6 (`react-router-dom` ^7.10.0)
- **HTTP Client**: Axios (`axios` ^1.13.2) with JWT interceptors (see `frontend/src/api/client.ts`)
  - Injects `x-user-email` header from `localStorage` on every request
  - On `401` response: clears stored email and redirects to `/login`
- **Other Dependencies**: `date-fns` ^4.1.0, `bootstrap` ^5.3.8, `@mui/x-date-pickers` ^8.19.0

### Key Pages

| Page | Description |
|---|---|
| **Login Page** | Email-based authentication |
| **Dashboard** | Overview with statistics and recent entries |
| **Clients Page** | Manage client list (add/edit/delete) |
| **Work Entries Page** | Track time with date picker and client selection |
| **Reports Page** | View and export client reports |

### Core TypeScript Types

Defined in `frontend/src/types/api.ts`:

- **Models**: `User`, `Client`, `WorkEntry`, `WorkEntryWithClient`, `ClientReport`
- **Request Interfaces**: `CreateClientRequest`, `UpdateClientRequest`, `CreateWorkEntryRequest`, `UpdateWorkEntryRequest`, `LoginRequest`, `LoginResponse`

---

## Backend

> Located in `backend/`

- **Runtime**: Node.js (18+), Express 4
- **Key Dependencies** (`backend/package.json`):

| Package | Version | Purpose |
|---|---|---|
| `sqlite3` | ^5.1.6 | In-memory database |
| `jsonwebtoken` | ^9.0.2 | JWT token support |
| `joi` | ^17.11.0 | Input validation |
| `helmet` | ^7.1.0 | Security headers |
| `cors` | ^2.8.5 | CORS protection |
| `express-rate-limit` | ^7.1.5 | Rate limiting |
| `morgan` | ^1.10.0 | HTTP logging |
| `pdfkit` | ^0.13.0 | PDF export |
| `csv-writer` | ^1.6.0 | CSV export |

### Middleware Stack

Defined in `backend/src/server.js`:

1. `helmet` — security headers
2. `cors` — restricted to `FRONTEND_URL` env var (default `http://localhost:5173`)
3. `express-rate-limit` — 100 requests per 15 minutes globally
4. `morgan` — HTTP logging
5. `express.json` — body parsing (10 MB limit)

### Health Check Endpoint

`GET /health` → returns `{ status: 'OK', timestamp }`

---

## Database Schema

Defined in `backend/src/database/init.js`.

### `users` Table

| Column | Type | Constraints |
|---|---|---|
| `email` | `TEXT` | **PRIMARY KEY** |
| `created_at` | `DATETIME` | Default current timestamp |

### `clients` Table

| Column | Type | Constraints |
|---|---|---|
| `id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** |
| `name` | `TEXT` | NOT NULL |
| `description` | `TEXT` | — |
| `department` | `TEXT` | — |
| `email` | `TEXT` | — |
| `user_email` | `TEXT` | NOT NULL, FK → `users(email)` |
| `created_at` | `DATETIME` | Default current timestamp |
| `updated_at` | `DATETIME` | Default current timestamp |

### `work_entries` Table

| Column | Type | Constraints |
|---|---|---|
| `id` | `INTEGER` | **PRIMARY KEY AUTOINCREMENT** |
| `client_id` | `INTEGER` | NOT NULL, FK → `clients(id)` |
| `user_email` | `TEXT` | NOT NULL, FK → `users(email)` |
| `hours` | `DECIMAL(5,2)` | NOT NULL |
| `description` | `TEXT` | — |
| `date` | `DATE` | NOT NULL |
| `created_at` | `DATETIME` | Default current timestamp |
| `updated_at` | `DATETIME` | Default current timestamp |

### Indexes

- `idx_clients_user_email`
- `idx_work_entries_client_id`
- `idx_work_entries_user_email`
- `idx_work_entries_date`

---

## Authentication

Defined in `backend/src/middleware/auth.js`.

- **Email-only authentication** — no passwords
- The `authenticateUser` middleware reads the `x-user-email` request header, validates email format via regex, and auto-creates the user in the DB if they don't exist
- Rate limiting on auth endpoints: **5 attempts per 15 minutes**
- JWT tokens expire after **24 hours** (though the current middleware uses the `x-user-email` header mechanism rather than Bearer tokens)

---

## Input Validation Schemas

Defined in `backend/src/validation/schemas.js`.

| Schema | Key Rules |
|---|---|
| `clientSchema` | `name` required (1–255 chars); optional `description` (max 1000), `department` (max 255), `email` (valid format) |
| `workEntrySchema` | `clientId` required (positive int); `hours` required (positive, max 24, 2 decimal precision); `date` required (ISO format) |
| `updateWorkEntrySchema` | All fields optional, but **at least one** must be provided |
| `updateClientSchema` | All fields optional, but **at least one** must be provided |
| `emailSchema` | Valid email required |

---

## API Endpoints

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login with email, returns JWT token |
| `GET` | `/api/auth/me` | Get current user info (requires auth) |

### Clients

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients` | Get all clients |
| `POST` | `/api/clients` | Create new client |
| `GET` | `/api/clients/:id` | Get specific client |
| `PUT` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Delete client |

### Work Entries

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/work-entries` | Get all work entries (optional `?clientId` filter) |
| `POST` | `/api/work-entries` | Create new work entry |
| `GET` | `/api/work-entries/:id` | Get specific work entry |
| `PUT` | `/api/work-entries/:id` | Update work entry |
| `DELETE` | `/api/work-entries/:id` | Delete work entry |

### Reports

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports/client/:clientId` | Get hourly report for client |
| `GET` | `/api/reports/export/csv/:clientId` | Export report as CSV |
| `GET` | `/api/reports/export/pdf/:clientId` | Export report as PDF |

---

## Security Features

- **Helmet** security headers
- **CORS** restricted to `FRONTEND_URL` origin
- **Rate limiting** — global: 100 req/15 min; auth: 5 req/15 min
- **Parameterized SQL queries** — SQL injection prevention
- **Joi input validation** on all endpoints

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `JWT_SECRET` | _(required)_ | Secret for JWT signing |

---

## Docker

Defined in `docker/Dockerfile`.

- **Multi-stage build** using Node 20 Alpine:
  1. `frontend-builder` — builds React app via `npm run build`
  2. `backend-builder` — installs production-only Node.js dependencies
  3. `production` — combines both, runs as non-root user (`nodejs`), uses `dumb-init`
- Production image uses **file-based SQLite** at `/app/data/timesheet.db` (via override files in `docker/overrides/`)
- **Exposed port**: 3001
- **Docker HEALTHCHECK**: polls `http://localhost:3001/health` every 30s

---

## Known Limitations

1. **In-memory database** — all data lost on server restart
2. **Email-only auth** — no password protection
3. **No user roles** — all users have equal access to all data
4. **Single-server architecture** — not designed for horizontal scaling
5. **No real-time updates** — changes require a page refresh

---

## Unit Test Coverage

### Test Configuration

- **Framework**: Jest 29 with Supertest 6
- **Test environment**: `node`
- **Configuration**: `backend/jest.config.js` and `backend/package.json`
- **Total**: **161 tests** across **8 test suites**

### Coverage Results

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| **Overall** | **90.16%** | **93.82%** | **92.18%** | **90.35%** |
| `database/init.js` | 100% | 100% | 100% | 100% |
| `middleware/auth.js` | 100% | 100% | 100% | 100% |
| `middleware/errorHandler.js` | 100% | 100% | 100% | 100% |
| `routes/auth.js` | 100% | 100% | 100% | 100% |
| `routes/clients.js` | 97.89% | 100% | 100% | 97.89% |
| `routes/workEntries.js` | 98.41% | 100% | 100% | 98.41% |
| `routes/reports.js` | 64.15% | 69.44% | 68.75% | 64.42% |
| `validation/schemas.js` | 100% | 100% | 100% | 100% |

### Enforced Coverage Thresholds

From `backend/jest.config.js`:

- Statements: 60%
- Branches: 60%
- Functions: 65%
- Lines: 60%

### Test Scripts

From `backend/package.json`:

| Script | Command | Description |
|---|---|---|
| `npm test` | `jest` | Run all tests |
| `npm run test:coverage` | `jest --coverage` | Run with coverage report |
| `npm run test:watch` | `jest --watch` | Watch mode for development |
| `npm run test:verbose` | `jest --verbose` | Verbose output |
| `npm run test:ci` | `jest --coverage --ci --maxWorkers=2` | CI mode |

### Notable Coverage Gaps

- `routes/reports.js` has the lowest coverage at **64.15% statements / 69.44% branches / 68.75% functions** — the PDF and CSV export paths are likely undertested.
