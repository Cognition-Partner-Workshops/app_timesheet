# Time Tracking Backend - Spring Boot

A Java Spring Boot implementation of the Employee Time Tracking backend API, translated from the original Node.js/Express backend.

## Technology Stack

- **Java 17+** (runtime)
- **Spring Boot 3.2** (framework)
- **Spring Data JPA** (data access)
- **H2 Database** (in-memory, equivalent to SQLite in-memory)
- **Jakarta Validation** (input validation)
- **OpenPDF** (PDF report generation)
- **OpenCSV** (CSV report generation)
- **Maven** (build tool)

## Quick Start

```bash
cd backend-spring
mvn spring-boot:run
# Server runs on http://localhost:3001
```

Or build and run the JAR:

```bash
mvn package -DskipTests
java -jar target/time-tracking-backend-1.0.0.jar
```

## API Endpoints

All endpoints match the original Node.js backend API contracts, so the existing React frontend works without changes.

### Health
- `GET /health` - Health check

### Auth (`/api/auth`)
- `POST /api/auth/login` - Email-based login (creates user if not exists)
- `GET /api/auth/me` - Get current user info (requires `x-user-email` header)

### Clients (`/api/clients`) - requires `x-user-email` header
- `GET /api/clients` - List all clients
- `GET /api/clients/{id}` - Get specific client
- `POST /api/clients` - Create client
- `PUT /api/clients/{id}` - Update client
- `DELETE /api/clients` - Delete all clients
- `DELETE /api/clients/{id}` - Delete specific client

### Work Entries (`/api/work-entries`) - requires `x-user-email` header
- `GET /api/work-entries` - List work entries (optional `clientId` query param)
- `GET /api/work-entries/{id}` - Get specific work entry
- `POST /api/work-entries` - Create work entry
- `PUT /api/work-entries/{id}` - Update work entry
- `DELETE /api/work-entries/{id}` - Delete work entry

### Reports (`/api/reports`) - requires `x-user-email` header
- `GET /api/reports/client/{clientId}` - Get hourly report
- `GET /api/reports/export/csv/{clientId}` - Export CSV report
- `GET /api/reports/export/pdf/{clientId}` - Export PDF report

## Authentication

Simple email-based authentication via the `x-user-email` request header. Users are auto-created on first request.

## Configuration

Configuration is in `src/main/resources/application.properties`:

| Property | Default | Description |
|---|---|---|
| `server.port` | 3001 | Server port |
| `app.frontend-url` | http://localhost:5173 | Frontend URL for CORS |
| `app.rate-limit.max-requests` | 100 | Max requests per window |
| `app.rate-limit.window-minutes` | 15 | Rate limit window in minutes |

## Data Persistence

This uses an H2 in-memory database. All data is lost on server restart, matching the original SQLite in-memory behavior. For persistence, change `spring.datasource.url` in `application.properties` to a file-based H2 or another database.
