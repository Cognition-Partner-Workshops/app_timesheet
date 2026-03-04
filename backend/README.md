# Client Timesheet App -- Backend

Node.js/Express REST API for tracking billable hours across clients.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication Flow](#authentication-flow)
- [API Endpoint Reference](#api-endpoint-reference)
  - [Health Check](#health-check)
  - [Auth](#auth)
  - [Clients](#clients)
  - [Work Entries](#work-entries)
  - [Reports](#reports)
- [Error Handling Conventions](#error-handling-conventions)
- [Database Schema Overview](#database-schema-overview)
- [Project Structure](#project-structure)

---

## Quick Start

```bash
cd backend
npm install
npm run dev    # Express server on http://localhost:3001
npm test       # Run Jest test suite
```

The development server uses an **in-memory SQLite** database that resets on each restart. Production deployments use a file-based SQLite database at `/app/data/timesheet.db`.

---

## Authentication Flow

The API uses a simplified **email-only authentication** scheme (no passwords):

1. **Login** -- The client sends `POST /api/auth/login` with `{ "email": "user@example.com" }`.
   - If the email already exists, the server returns 200 with the user object.
   - If the email is new, the server **auto-creates** the user and returns 201.
2. **Subsequent requests** -- The client includes the `x-user-email` HTTP header on every request.
3. **Middleware verification** -- The `authenticateUser` middleware (`middleware/auth.js`) validates the header, looks up (or creates) the user, and attaches `req.userEmail` for downstream handlers.
4. **Data isolation** -- All database queries filter by `user_email`, ensuring each user only sees their own data.

> **Note:** There are no passwords or JWT tokens stored server-side in the current implementation. The `x-user-email` header acts as the sole authentication credential.

---

## API Endpoint Reference

All API routes are prefixed with `/api`. Unless noted otherwise, request and response bodies are JSON (`Content-Type: application/json`).

### Health Check

| Method | Path      | Auth | Description                    |
|--------|-----------|------|--------------------------------|
| GET    | `/health` | No   | Returns server status and time |

**Response (200):**

```json
{ "status": "OK", "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

### Auth

| Method | Path              | Auth | Description                          |
|--------|-------------------|------|--------------------------------------|
| POST   | `/api/auth/login` | No   | Login or register with email         |
| GET    | `/api/auth/me`    | Yes  | Get current authenticated user info  |

#### `POST /api/auth/login`

**Request body:**

```json
{ "email": "user@example.com" }
```

**Response (200) -- existing user:**

```json
{
  "message": "Login successful",
  "user": { "email": "user@example.com", "createdAt": "2025-01-01T00:00:00.000Z" }
}
```

**Response (201) -- new user:**

```json
{
  "message": "User created and logged in successfully",
  "user": { "email": "user@example.com", "createdAt": "2025-01-01T00:00:00.000Z" }
}
```

#### `GET /api/auth/me`

**Headers:** `x-user-email: user@example.com`

**Response (200):**

```json
{
  "user": { "email": "user@example.com", "createdAt": "2025-01-01T00:00:00.000Z" }
}
```

---

### Clients

All client endpoints require the `x-user-email` header. Clients are scoped to the authenticated user.

| Method | Path                | Description                     |
|--------|---------------------|---------------------------------|
| GET    | `/api/clients`      | List all clients for the user   |
| GET    | `/api/clients/:id`  | Get a single client by ID       |
| POST   | `/api/clients`      | Create a new client             |
| PUT    | `/api/clients/:id`  | Update an existing client       |
| DELETE | `/api/clients`      | Delete all clients for the user |
| DELETE | `/api/clients/:id`  | Delete a single client by ID    |

#### `GET /api/clients`

**Response (200):**

```json
{
  "clients": [
    {
      "id": 1,
      "name": "Acme Corp",
      "description": "Web redesign project",
      "department": "Engineering",
      "email": "contact@acme.com",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /api/clients/:id`

**Response (200):**

```json
{
  "client": {
    "id": 1,
    "name": "Acme Corp",
    "description": "Web redesign project",
    "department": "Engineering",
    "email": "contact@acme.com",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

#### `POST /api/clients`

**Request body:**

| Field         | Type   | Required | Constraints                |
|---------------|--------|----------|----------------------------|
| `name`        | string | yes      | 1-255 chars                |
| `description` | string | no       | max 1000 chars             |
| `department`  | string | no       | max 255 chars              |
| `email`       | string | no       | valid email, max 255 chars |

```json
{
  "name": "Acme Corp",
  "description": "Web redesign project",
  "department": "Engineering",
  "email": "contact@acme.com"
}
```

**Response (201):**

```json
{
  "message": "Client created successfully",
  "client": { "id": 1, "name": "Acme Corp", "..." : "..." }
}
```

#### `PUT /api/clients/:id`

Partial update -- at least one field must be provided. Same fields as `POST` but all optional.

**Response (200):**

```json
{
  "message": "Client updated successfully",
  "client": { "id": 1, "name": "Acme Corp (updated)", "..." : "..." }
}
```

#### `DELETE /api/clients`

Deletes **all** clients for the authenticated user. Associated work entries are removed via CASCADE.

**Response (200):**

```json
{ "message": "All clients deleted successfully", "deletedCount": 3 }
```

#### `DELETE /api/clients/:id`

Deletes a single client. Associated work entries are removed via CASCADE.

**Response (200):**

```json
{ "message": "Client deleted successfully" }
```

---

### Work Entries

All work-entry endpoints require the `x-user-email` header.

| Method | Path                     | Description                                |
|--------|--------------------------|--------------------------------------------|
| GET    | `/api/work-entries`      | List entries (optional `?clientId=` filter) |
| GET    | `/api/work-entries/:id`  | Get a single entry by ID                   |
| POST   | `/api/work-entries`      | Create a new entry                         |
| PUT    | `/api/work-entries/:id`  | Update an existing entry                   |
| DELETE | `/api/work-entries/:id`  | Delete an entry                            |

#### `GET /api/work-entries`

**Query parameters:**

| Parameter  | Type   | Required | Description          |
|------------|--------|----------|----------------------|
| `clientId` | number | no       | Filter by client ID  |

**Response (200):**

```json
{
  "workEntries": [
    {
      "id": 1,
      "client_id": 1,
      "hours": 4.5,
      "description": "Frontend development",
      "date": "2025-01-15",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z",
      "client_name": "Acme Corp"
    }
  ]
}
```

#### `GET /api/work-entries/:id`

**Response (200):**

```json
{
  "workEntry": {
    "id": 1,
    "client_id": 1,
    "hours": 4.5,
    "description": "Frontend development",
    "date": "2025-01-15",
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z",
    "client_name": "Acme Corp"
  }
}
```

#### `POST /api/work-entries`

**Request body:**

| Field         | Type   | Required | Constraints                        |
|---------------|--------|----------|------------------------------------|
| `clientId`    | number | yes      | must reference an owned client     |
| `hours`       | number | yes      | positive, max 24, up to 2 decimals |
| `description` | string | no       | max 1000 chars                     |
| `date`        | string | yes      | ISO 8601 date format               |

```json
{
  "clientId": 1,
  "hours": 4.5,
  "description": "Frontend development",
  "date": "2025-01-15"
}
```

**Response (201):**

```json
{
  "message": "Work entry created successfully",
  "workEntry": { "id": 1, "client_id": 1, "hours": 4.5, "..." : "..." }
}
```

#### `PUT /api/work-entries/:id`

Partial update -- at least one field must be provided. Same fields as `POST` but all optional. If `clientId` is changed it must reference an owned client.

**Response (200):**

```json
{
  "message": "Work entry updated successfully",
  "workEntry": { "id": 1, "..." : "..." }
}
```

#### `DELETE /api/work-entries/:id`

**Response (200):**

```json
{ "message": "Work entry deleted successfully" }
```

---

### Reports

All report endpoints require the `x-user-email` header.

| Method | Path                                | Description                             |
|--------|-------------------------------------|-----------------------------------------|
| GET    | `/api/reports/client/:clientId`     | JSON summary with total hours & entries |
| GET    | `/api/reports/export/csv/:clientId` | Download report as CSV file             |
| GET    | `/api/reports/export/pdf/:clientId` | Download report as PDF file             |

#### `GET /api/reports/client/:clientId`

**Response (200):**

```json
{
  "client": { "id": 1, "name": "Acme Corp" },
  "workEntries": [
    {
      "id": 1,
      "hours": 4.5,
      "description": "Frontend development",
      "date": "2025-01-15",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "totalHours": 4.5,
  "entryCount": 1
}
```

#### `GET /api/reports/export/csv/:clientId`

Returns a downloadable CSV file with columns: **Date**, **Hours**, **Description**, **Created At**.

**Response headers:**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="Acme_Corp_report_2025-01-15T10-00-00-000Z.csv"
```

#### `GET /api/reports/export/pdf/:clientId`

Returns a downloadable PDF file containing a formatted time report with title, summary statistics, and a table of work entries.

**Response headers:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Acme_Corp_report_2025-01-15T10-00-00-000Z.pdf"
```

---

## Error Handling Conventions

All errors are returned as JSON with a consistent shape. The centralized error handler (`middleware/errorHandler.js`) processes errors forwarded via `next(err)`.

### Error Response Formats

| Category              | HTTP Status         | Response Shape                                              |
|-----------------------|---------------------|-------------------------------------------------------------|
| Joi validation errors | 400                 | `{ "error": "Validation error", "details": ["..."] }`      |
| Invalid ID parameter  | 400                 | `{ "error": "Invalid client ID" }`                          |
| Missing auth header   | 401                 | `{ "error": "User email required in x-user-email header" }` |
| Invalid email format  | 400                 | `{ "error": "Invalid email format" }`                       |
| Resource not found    | 404                 | `{ "error": "Client not found" }`                           |
| SQLite errors         | 500                 | `{ "error": "Database error", "message": "..." }`          |
| Generic server errors | 500                 | `{ "error": "Internal server error" }`                      |
| Route not found       | 404                 | `{ "error": "Route not found" }`                            |

### Validation Details

Request bodies are validated using [Joi](https://joi.dev/) schemas defined in `validation/schemas.js`. When validation fails, the error is forwarded to the error handler which returns a 400 response with an array of human-readable messages:

```json
{
  "error": "Validation error",
  "details": [
    "\"name\" is required",
    "\"hours\" must be less than or equal to 24"
  ]
}
```

---

## Database Schema Overview

The application uses **SQLite** with three tables. Foreign-key `ON DELETE CASCADE` constraints ensure referential integrity.

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│    users     │       │     clients      │       │    work_entries      │
├──────────────┤       ├──────────────────┤       ├──────────────────────┤
│ email (PK)   │◄──┐   │ id (PK, AUTO)    │◄──┐   │ id (PK, AUTO)        │
│ created_at   │   │   │ name             │   │   │ client_id (FK)  ─────┘
│              │   ├──▶│ user_email (FK)   │   │   │ user_email (FK) ─────┐
│              │   │   │ description      │   │   │ hours                │
│              │   │   │ department       │   │   │ description          │
│              │   │   │ email            │   │   │ date                 │
│              │   │   │ created_at       │   │   │ created_at           │
│              │   │   │ updated_at       │   │   │ updated_at           │
└──────────────┘   │   └──────────────────┘   │   └──────────────────────┘
                   └──────────────────────────┘
```

### `users`

| Column       | Type     | Constraints            |
|--------------|----------|------------------------|
| `email`      | TEXT     | PRIMARY KEY            |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### `clients`

| Column       | Type     | Constraints                                    |
|--------------|----------|------------------------------------------------|
| `id`         | INTEGER  | PRIMARY KEY AUTOINCREMENT                      |
| `name`       | TEXT     | NOT NULL                                       |
| `description`| TEXT     |                                                |
| `department` | TEXT     |                                                |
| `email`      | TEXT     |                                                |
| `user_email` | TEXT     | NOT NULL, FOREIGN KEY -> `users(email)` CASCADE |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP                      |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP                      |

### `work_entries`

| Column       | Type        | Constraints                                       |
|--------------|-------------|---------------------------------------------------|
| `id`         | INTEGER     | PRIMARY KEY AUTOINCREMENT                         |
| `client_id`  | INTEGER     | NOT NULL, FOREIGN KEY -> `clients(id)` CASCADE    |
| `user_email` | TEXT        | NOT NULL, FOREIGN KEY -> `users(email)` CASCADE   |
| `hours`      | DECIMAL(5,2)| NOT NULL                                          |
| `description`| TEXT        |                                                   |
| `date`       | DATE        | NOT NULL                                          |
| `created_at` | DATETIME    | DEFAULT CURRENT_TIMESTAMP                         |
| `updated_at` | DATETIME    | DEFAULT CURRENT_TIMESTAMP                         |

### Indexes

| Index Name                       | Table          | Column(s)    |
|----------------------------------|----------------|--------------|
| `idx_clients_user_email`         | `clients`      | `user_email` |
| `idx_work_entries_client_id`     | `work_entries`  | `client_id`  |
| `idx_work_entries_user_email`    | `work_entries`  | `user_email` |
| `idx_work_entries_date`          | `work_entries`  | `date`       |

---

## Project Structure

```
backend/
├── src/
│   ├── __tests__/            # Jest test suites
│   ├── database/
│   │   └── init.js           # SQLite schema & singleton connection
│   ├── middleware/
│   │   ├── auth.js           # Email-based authentication middleware
│   │   └── errorHandler.js   # Centralized error handler
│   ├── routes/
│   │   ├── auth.js           # Login & user profile endpoints
│   │   ├── clients.js        # Client CRUD endpoints
│   │   ├── reports.js        # Report generation & CSV/PDF export
│   │   └── workEntries.js    # Work entry CRUD endpoints
│   ├── validation/
│   │   └── schemas.js        # Joi validation schemas
│   └── server.js             # Express app entrypoint
├── package.json
└── README.md                 # (this file)
```
