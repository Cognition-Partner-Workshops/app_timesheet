# Time Tracking Backend API

Node.js / Express REST API for the Employee Time Tracking application. Provides
user authentication, client management, work-entry tracking, and report
generation with CSV and PDF export.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Middleware Pipeline](#middleware-pipeline)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [Auth](#auth)
  - [Clients](#clients)
  - [Work Entries](#work-entries)
  - [Reports](#reports)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Architecture Overview

```
                        ┌──────────────┐
  HTTP request ───────► │  Express App │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
         Helmet/CORS     Rate Limiter       Morgan Logger
              │                │                 │
              └────────────────┼─────────────────┘
                               ▼
                      ┌─────────────────┐
                      │  Route Handlers  │
                      │  (auth, clients, │
                      │  workEntries,    │
                      │  reports)        │
                      └────────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
     Auth Middleware    Joi Validation    Error Handler
              │                                 │
              └────────────────┬────────────────┘
                               ▼
                      ┌─────────────────┐
                      │  SQLite (in-mem) │
                      └─────────────────┘
```

Key dependencies:

| Package              | Purpose                           |
|----------------------|-----------------------------------|
| `express`            | HTTP server & routing             |
| `sqlite3`            | In-memory SQLite database         |
| `joi`                | Request body validation           |
| `helmet`             | HTTP security headers             |
| `cors`               | Cross-Origin Resource Sharing     |
| `express-rate-limit` | Request throttling                |
| `morgan`             | HTTP request logging              |
| `pdfkit`             | PDF report generation             |
| `csv-writer`         | CSV report generation             |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** (bundled with Node.js)

### Install & Run

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Create your local environment file
cp .env.example .env   # then edit as needed (see section below)

# 3. Start in development mode (auto-restarts on file changes)
npm run dev
```

The server will be available at **http://localhost:3001**.

### Available npm Scripts

| Script                | Description                                       |
|-----------------------|---------------------------------------------------|
| `npm start`           | Start the server in production mode               |
| `npm run dev`         | Start with `nodemon` for auto-reload              |
| `npm test`            | Run the full Jest test suite                      |
| `npm run test:watch`  | Run tests in watch mode                           |
| `npm run test:coverage` | Run tests and generate a coverage report        |
| `npm run test:verbose`  | Run tests with verbose output                   |
| `npm run test:ci`     | Run tests in CI mode (coverage + limited workers) |

---

## Environment Variables

Configured via a `.env` file in the `backend/` directory. See `.env.example`
for defaults.

| Variable        | Required | Default                  | Description                                        |
|-----------------|----------|--------------------------|----------------------------------------------------|
| `PORT`          | No       | `3001`                   | Port the server listens on                         |
| `NODE_ENV`      | No       | `development`            | `development` or `production`                      |
| `FRONTEND_URL`  | No       | `http://localhost:5173`  | Allowed CORS origin for the frontend               |
| `JWT_SECRET`    | Yes (prod) | -                      | Secret key for signing JWT tokens (min 32 chars)   |

---

## Project Structure

```
backend/
├── src/
│   ├── server.js                # Express app setup & startup
│   ├── database/
│   │   └── init.js              # SQLite connection & schema creation
│   ├── middleware/
│   │   ├── auth.js              # Email-based authentication middleware
│   │   └── errorHandler.js      # Centralised JSON error handler
│   ├── routes/
│   │   ├── auth.js              # POST /api/auth/login, GET /api/auth/me
│   │   ├── clients.js           # CRUD for /api/clients
│   │   ├── workEntries.js       # CRUD for /api/work-entries
│   │   └── reports.js           # GET /api/reports/* (JSON, CSV, PDF)
│   ├── validation/
│   │   └── schemas.js           # Joi schemas for request bodies
│   └── __tests__/               # Jest test suites
├── package.json
├── jest.config.js
├── .env.example
├── DEPLOYMENT.md                # Production deployment guide
└── README.md                    # ← You are here
```

---

## Middleware Pipeline

Middleware is registered in `server.js` in the order below. The order matters
because Express processes middleware sequentially.

| Order | Middleware           | Purpose                                                    |
|-------|----------------------|------------------------------------------------------------|
| 1     | `helmet()`           | Sets secure HTTP headers (CSP, HSTS, etc.)                 |
| 2     | `cors()`             | Allows requests from `FRONTEND_URL`                        |
| 3     | `express-rate-limit` | 100 requests per IP per 15 min window                      |
| 4     | `morgan('combined')` | Logs every request in Apache combined format               |
| 5     | `express.json()`     | Parses JSON bodies (max 10 MB)                             |
| 6     | `express.urlencoded` | Parses URL-encoded bodies                                  |
| 7     | Route handlers       | Application logic (see API Reference)                      |
| 8     | `errorHandler`       | Catches `next(err)` and returns consistent JSON errors     |
| 9     | 404 catch-all        | Returns `{ "error": "Route not found" }` for unknown paths |

---

## Authentication

The API uses a **simple email-based authentication** scheme - no password is
required. This is designed for trusted internal networks; for production
deployments, consider integrating with your company's SSO/OAuth provider.

### How It Works

1. The client sends `POST /api/auth/login` with `{ "email": "..." }`.
2. If the user doesn't exist yet, a row is created (auto-registration).
3. A success response is returned with the user profile.
4. For all subsequent requests, include the header:

   ```
   x-user-email: user@example.com
   ```

5. The `authenticateUser` middleware validates the email format, verifies the
   user exists (or auto-creates them), and attaches `req.userEmail` for
   downstream handlers.

> **Note:** All data is scoped per user - users can only access their own
> clients and work entries.

---

## API Reference

All endpoints return JSON. Authenticated endpoints require the
`x-user-email` header.

### Health Check

#### `GET /health`

Returns server status. **Does not require authentication.**

```bash
curl http://localhost:3001/health
```

Response `200`:
```json
{ "status": "OK", "timestamp": "2024-01-15T10:30:00.000Z" }
```

---

### Auth

#### `POST /api/auth/login`

Authenticate or register a user.

**Request body:**
```json
{ "email": "alice@example.com" }
```

**Response `200`** (existing user):
```json
{
  "message": "Login successful",
  "user": { "email": "alice@example.com", "createdAt": "2024-01-01T00:00:00.000Z" }
}
```

**Response `201`** (new user):
```json
{
  "message": "User created and logged in successfully",
  "user": { "email": "alice@example.com", "createdAt": "2024-01-15T10:30:00.000Z" }
}
```

---

#### `GET /api/auth/me`

Returns the authenticated user's profile.

```bash
curl -H "x-user-email: alice@example.com" http://localhost:3001/api/auth/me
```

**Response `200`:**
```json
{
  "user": { "email": "alice@example.com", "createdAt": "2024-01-01T00:00:00.000Z" }
}
```

| Status | Meaning                          |
|--------|----------------------------------|
| `401`  | Missing `x-user-email` header    |
| `404`  | User not found                   |

---

### Clients

All client endpoints require the `x-user-email` header.

#### `GET /api/clients`

List all clients for the authenticated user (alphabetical order).

**Response `200`:**
```json
{
  "clients": [
    {
      "id": 1,
      "name": "Acme Corp",
      "description": "Web development",
      "department": "Engineering",
      "email": "contact@acme.com",
      "created_at": "2024-01-10T08:00:00.000Z",
      "updated_at": "2024-01-10T08:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/clients/:id`

Get a single client by ID.

| Status | Meaning                              |
|--------|--------------------------------------|
| `400`  | Invalid (non-numeric) ID             |
| `404`  | Client not found or not owned by user|

---

#### `POST /api/clients`

Create a new client.

**Request body:**
```json
{
  "name": "Acme Corp",
  "description": "Web development",
  "department": "Engineering",
  "email": "contact@acme.com"
}
```

Only `name` is required. See [Validation](#validation) for field constraints.

**Response `201`:**
```json
{
  "message": "Client created successfully",
  "client": { "id": 1, "name": "Acme Corp", "..." : "..." }
}
```

---

#### `PUT /api/clients/:id`

Partially update a client. Only supplied fields are changed; omitted fields
remain as-is. At least one field must be provided.

**Request body (example):**
```json
{ "name": "Acme Corp (Renamed)" }
```

**Response `200`:**
```json
{
  "message": "Client updated successfully",
  "client": { "..." : "..." }
}
```

| Status | Meaning                              |
|--------|--------------------------------------|
| `400`  | Invalid ID or validation error       |
| `404`  | Client not found or not owned by user|

---

#### `DELETE /api/clients`

Delete **all** clients belonging to the authenticated user. Associated work
entries are removed via the CASCADE foreign-key constraint.

**Response `200`:**
```json
{ "message": "All clients deleted successfully", "deletedCount": 3 }
```

---

#### `DELETE /api/clients/:id`

Delete a single client. Associated work entries are removed automatically.

| Status | Meaning                              |
|--------|--------------------------------------|
| `400`  | Invalid (non-numeric) ID             |
| `404`  | Client not found or not owned by user|

**Response `200`:**
```json
{ "message": "Client deleted successfully" }
```

---

### Work Entries

All work-entry endpoints require the `x-user-email` header.

#### `GET /api/work-entries`

List all work entries for the authenticated user, ordered by date descending.

**Query params (optional):**

| Param      | Type    | Description                        |
|------------|---------|------------------------------------|
| `clientId` | integer | Filter entries to a specific client|

**Response `200`:**
```json
{
  "workEntries": [
    {
      "id": 1,
      "client_id": 2,
      "hours": 3.5,
      "description": "API integration work",
      "date": "2024-01-15",
      "created_at": "2024-01-15T09:00:00.000Z",
      "updated_at": "2024-01-15T09:00:00.000Z",
      "client_name": "Acme Corp"
    }
  ]
}
```

---

#### `GET /api/work-entries/:id`

Get a single work entry by ID.

| Status | Meaning                                  |
|--------|------------------------------------------|
| `400`  | Invalid (non-numeric) ID                 |
| `404`  | Work entry not found or not owned by user|

---

#### `POST /api/work-entries`

Create a new work entry. The referenced client must exist and belong to the
authenticated user.

**Request body:**
```json
{
  "clientId": 2,
  "hours": 3.5,
  "description": "API integration work",
  "date": "2024-01-15"
}
```

All fields except `description` are required. See [Validation](#validation)
for constraints.

**Response `201`:**
```json
{
  "message": "Work entry created successfully",
  "workEntry": { "id": 1, "client_id": 2, "hours": 3.5, "..." : "..." }
}
```

| Status | Meaning                                         |
|--------|-------------------------------------------------|
| `400`  | Validation error or client not owned by user     |

---

#### `PUT /api/work-entries/:id`

Partially update a work entry. At least one field must be provided. If
`clientId` is changed, the new client must also belong to the user.

**Request body (example):**
```json
{ "hours": 4.0 }
```

| Status | Meaning                                          |
|--------|--------------------------------------------------|
| `400`  | Invalid ID, validation error, or invalid client   |
| `404`  | Work entry not found or not owned by user         |

---

#### `DELETE /api/work-entries/:id`

Delete a single work entry.

| Status | Meaning                                  |
|--------|------------------------------------------|
| `400`  | Invalid (non-numeric) ID                 |
| `404`  | Work entry not found or not owned by user|

**Response `200`:**
```json
{ "message": "Work entry deleted successfully" }
```

---

### Reports

All report endpoints require the `x-user-email` header.

#### `GET /api/reports/client/:clientId`

Returns a JSON summary report for a client including all work entries, total
hours, and entry count.

**Response `200`:**
```json
{
  "client": { "id": 1, "name": "Acme Corp" },
  "workEntries": [
    { "id": 1, "hours": 3.5, "description": "...", "date": "2024-01-15", "..." : "..." }
  ],
  "totalHours": 42.5,
  "entryCount": 12
}
```

| Status | Meaning                              |
|--------|--------------------------------------|
| `400`  | Invalid (non-numeric) clientId       |
| `404`  | Client not found or not owned by user|

---

#### `GET /api/reports/export/csv/:clientId`

Downloads a CSV file with all work entries for the client.

**CSV columns:** Date, Hours, Description, Created At.

```bash
curl -H "x-user-email: alice@example.com" \
     -o report.csv \
     http://localhost:3001/api/reports/export/csv/1
```

The file is generated in a temporary directory, streamed as a download, and
then automatically cleaned up.

---

#### `GET /api/reports/export/pdf/:clientId`

Streams a PDF report for the client. The document includes a title page with
summary statistics and a table of all work entries with automatic page breaks.

```bash
curl -H "x-user-email: alice@example.com" \
     -o report.pdf \
     http://localhost:3001/api/reports/export/pdf/1
```

---

## Error Handling

All errors are returned as JSON with a consistent shape. The centralised
error handler in `middleware/errorHandler.js` processes three categories:

| Category              | HTTP Status | Response Shape                                                              |
|-----------------------|-------------|-----------------------------------------------------------------------------|
| **Joi validation**    | `400`       | `{ "error": "Validation error", "details": ["\"name\" is required", ...] }` |
| **SQLite error**      | `500`       | `{ "error": "Database error", "message": "An error occurred..." }`          |
| **Other / unknown**   | `err.status` or `500` | `{ "error": "<message>" }`                                       |

---

## Validation

Request bodies are validated using [Joi](https://joi.dev/) schemas defined in
`src/validation/schemas.js`. Validation runs **before** any database
interaction. On failure, the error is forwarded to the error handler which
returns a `400` with field-level details.

### Client Schema (create)

| Field         | Type   | Required | Constraints                 |
|---------------|--------|----------|-----------------------------|
| `name`        | string | Yes      | 1 - 255 characters, trimmed |
| `description` | string | No       | Max 1 000 characters         |
| `department`  | string | No       | Max 255 characters           |
| `email`       | string | No       | Valid email, max 255 chars   |

### Client Schema (update)

Same fields as create, but all are optional. At least one field must be
provided.

### Work Entry Schema (create)

| Field         | Type   | Required | Constraints                          |
|---------------|--------|----------|--------------------------------------|
| `clientId`    | number | Yes      | Positive integer                     |
| `hours`       | number | Yes      | Positive, max 24, up to 2 decimals   |
| `description` | string | No       | Max 1 000 characters                  |
| `date`        | date   | Yes      | ISO 8601 format (`YYYY-MM-DD`)       |

### Work Entry Schema (update)

Same fields as create, but all are optional. At least one field must be
provided.

### Email Schema (login)

| Field   | Type   | Required | Constraints |
|---------|--------|----------|-------------|
| `email` | string | Yes      | Valid email |

---

## Database Schema

The application uses **SQLite in-memory** storage. All data is lost on server
restart. For persistent storage, change the connection string in
`src/database/init.js` from `:memory:` to a file path.

### Tables

#### `users`

| Column       | Type     | Constraints                  |
|-------------|----------|-------------------------------|
| `email`      | TEXT     | PRIMARY KEY                   |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP     |

#### `clients`

| Column       | Type     | Constraints                                |
|-------------|----------|--------------------------------------------|
| `id`         | INTEGER  | PRIMARY KEY AUTOINCREMENT                  |
| `name`       | TEXT     | NOT NULL                                   |
| `description`| TEXT     |                                            |
| `department` | TEXT     |                                            |
| `email`      | TEXT     |                                            |
| `user_email` | TEXT     | NOT NULL, FK -> `users.email` (CASCADE)    |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP                  |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP                  |

#### `work_entries`

| Column       | Type        | Constraints                                |
|-------------|-------------|--------------------------------------------|
| `id`         | INTEGER     | PRIMARY KEY AUTOINCREMENT                  |
| `client_id`  | INTEGER     | NOT NULL, FK -> `clients.id` (CASCADE)     |
| `user_email` | TEXT        | NOT NULL, FK -> `users.email` (CASCADE)    |
| `hours`      | DECIMAL(5,2)| NOT NULL                                   |
| `description`| TEXT        |                                            |
| `date`       | DATE        | NOT NULL                                   |
| `created_at` | DATETIME    | DEFAULT CURRENT_TIMESTAMP                  |
| `updated_at` | DATETIME    | DEFAULT CURRENT_TIMESTAMP                  |

### Indexes

| Index Name                       | Table          | Column(s)    |
|----------------------------------|---------------|--------------|
| `idx_clients_user_email`         | `clients`      | `user_email` |
| `idx_work_entries_client_id`     | `work_entries`  | `client_id`  |
| `idx_work_entries_user_email`    | `work_entries`  | `user_email` |
| `idx_work_entries_date`          | `work_entries`  | `date`       |

### Entity-Relationship Diagram

```
┌─────────┐       ┌───────────┐       ┌──────────────┐
│  users   │──1:N──│  clients   │──1:N──│ work_entries  │
│  (email) │       │  (id)      │       │  (id)         │
└─────────┘       └───────────┘       └──────────────┘
```

---

## Testing

Tests are written with [Jest](https://jestjs.io/) and
[Supertest](https://github.com/ladakh/supertest) and live in
`src/__tests__/`.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-runs on file changes)
npm run test:watch
```

Coverage thresholds (configured in `jest.config.js`):

| Metric      | Threshold |
|-------------|-----------|
| Statements  | 60%       |
| Branches    | 60%       |
| Functions   | 65%       |
| Lines       | 60%       |

---

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full production deployment
instructions including PM2, Docker, and systemd options.

### Quick Checklist

- [ ] Set a strong, random `JWT_SECRET` (32+ characters).
- [ ] Set `FRONTEND_URL` to the production frontend origin.
- [ ] Consider switching from `:memory:` to file-based SQLite for data persistence.
- [ ] Enable HTTPS via a reverse proxy (nginx, Caddy, etc.).
- [ ] Review rate-limiting thresholds for expected traffic.
- [ ] Set up structured logging (e.g. Winston) and log rotation.
- [ ] Monitor the `/health` endpoint for uptime checks.
