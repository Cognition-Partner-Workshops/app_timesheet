# Time Tracking Backend API

A Node.js/Express backend API for employee time tracking application with SQLite in-memory database.

## Features

- **User Authentication**: Simple email-based authentication
- **Client Management**: CRUD operations for clients
- **Work Entry Management**: Track hourly work for different clients
- **Reporting**: Generate and export reports in CSV/PDF formats
- **Data Validation**: Input validation using Joi
- **Security**: Rate limiting, CORS, and security headers

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login with email
- `GET /api/auth/me` - Get current user info

### Clients
- `GET /api/clients` - Get all clients for authenticated user
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get specific client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Work Entries
- `GET /api/work-entries` - Get all work entries (with optional client filter)
- `POST /api/work-entries` - Create new work entry
- `GET /api/work-entries/:id` - Get specific work entry
- `PUT /api/work-entries/:id` - Update work entry
- `DELETE /api/work-entries/:id` - Delete work entry

### Reports
- `GET /api/reports/client/:clientId` - Get hourly report for specific client
- `GET /api/reports/export/csv/:clientId` - Export client report as CSV
- `GET /api/reports/export/pdf/:clientId` - Export client report as PDF

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

4. For production:
```bash
npm start
```

## Authentication

The API uses simple email-based authentication. Include the user's email in the `x-user-email` header for all authenticated requests.

Example:
```
x-user-email: user@company.com
```

## Database Schema

### Users
- `email` (TEXT, PRIMARY KEY)
- `created_at` (DATETIME)

### Clients
- `id` (INTEGER, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `user_email` (TEXT, FOREIGN KEY)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Work Entries
- `id` (INTEGER, PRIMARY KEY)
- `client_id` (INTEGER, FOREIGN KEY)
- `user_email` (TEXT, FOREIGN KEY)
- `hours` (DECIMAL)
- `description` (TEXT)
- `date` (DATE)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

## Project Structure

```
backend/src/
├── server.js              # Express app entry point – middleware, routes, startup
├── database/
│   └── init.js            # SQLite singleton connection, schema creation, teardown
├── middleware/
│   ├── auth.js            # Email-based authentication (x-user-email header)
│   └── errorHandler.js    # Centralized error handler (Joi, SQLite, generic)
├── routes/
│   ├── auth.js            # POST /login, GET /me
│   ├── clients.js         # Full CRUD for clients
│   ├── workEntries.js     # Full CRUD for work/time entries
│   └── reports.js         # JSON reports, CSV & PDF exports
└── validation/
    └── schemas.js         # Joi schemas for all request payloads
```

### Key architectural details

| Layer | Responsibility |
|-------|---------------|
| **server.js** | Configures Helmet, CORS, rate limiting (100 req / 15 min), Morgan logging, JSON body parsing (10 MB limit), and mounts all route modules. |
| **middleware/auth.js** | Reads the `x-user-email` header, validates the email format, and auto-registers unknown users before attaching `req.userEmail` for downstream handlers. |
| **middleware/errorHandler.js** | Normalizes Joi validation errors (400), SQLite errors (500, sanitized), and generic errors into a consistent JSON shape. |
| **database/init.js** | Manages a singleton in-memory SQLite connection. `initializeDatabase()` creates the `users`, `clients`, and `work_entries` tables with foreign keys and performance indexes. `closeDatabase()` handles idempotent, concurrency-safe teardown. |
| **validation/schemas.js** | Exports five Joi schemas (`clientSchema`, `workEntrySchema`, `updateWorkEntrySchema`, `updateClientSchema`, `emailSchema`) consumed by the route handlers. |
| **routes/** | Each route module applies `authenticateUser` at the router level, validates input via Joi, and interacts with the database through callback-based SQLite queries. |

> All source files include comprehensive JSDoc inline documentation describing
> modules, functions, route contracts (`@route`, `@param`, `@returns`), and
> error responses.

## Development

- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm start` - Start production server

## Health Check

The API includes a health check endpoint at `/health` that returns server status and timestamp.
