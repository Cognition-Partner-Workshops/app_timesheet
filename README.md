# MusicPlayer - Spotify-like Music Player MVP

A full-stack music player web application inspired by Spotify, featuring a dark theme UI, audio streaming, playlist management, and user authentication.

![Tech Stack](https://img.shields.io/badge/React-TypeScript-blue) ![Backend](https://img.shields.io/badge/Express-Node.js-green) ![Database](https://img.shields.io/badge/PostgreSQL-16-blue) ![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT (JSON Web Tokens) |
| Audio Storage | Local file system (MVP) |
| Containerization | Docker + Docker Compose |
| State Management | Zustand |
| HTTP Client | Axios |
| Icons | Lucide React |

## Features

- **User Authentication** - Register and login with JWT-based auth
- **Song Library** - Browse all available songs with search functionality
- **Audio Streaming** - Stream audio with range request support
- **Music Player** - Full-featured player with play/pause, next/prev, progress bar, and volume control
- **Playlists** - Create, view, and manage playlists
- **Dark Theme** - Spotify-inspired dark UI with green accents
- **Responsive Layout** - Sidebar navigation, main content area, and bottom player bar
- **File Upload** - Upload audio files via API (with multer)

## Project Structure

```
music-player-app/
├── frontend/               # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/            # API client and types
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand state stores
│   │   ├── App.tsx         # Main app with routing
│   │   └── main.tsx        # Entry point
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                # Express + TypeScript
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Auth and upload middleware
│   │   ├── routes/         # API route handlers
│   │   ├── types/          # TypeScript interfaces
│   │   ├── index.ts        # Server entry point
│   │   └── seed.ts         # Database seed script
│   ├── uploads/            # Audio file storage
│   └── Dockerfile
└── docker-compose.yml      # Full stack orchestration
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Or for local development: Node.js 20+, PostgreSQL 16

### Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url>
cd music-player-app

# Start all services
docker-compose up --build

# In another terminal, seed the database
docker-compose exec backend npm run seed
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

### Local Development

```bash
# Backend
cd backend
cp .env.example .env    # Configure your database URL
npm install
npm run dev             # Starts on port 4000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev             # Starts on port 3000
```

### Demo Credentials

After running the seed script:
- **Email**: demo@musicplayer.com
- **Password**: demo123

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |

### Songs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/songs` | List songs (search, pagination) | No |
| GET | `/api/songs/:id/stream` | Stream audio file | No |
| POST | `/api/songs/upload` | Upload a song | Yes |

**Query parameters for GET /api/songs:**
- `search` - Search by title, artist, or album
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### Playlists

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/playlists` | Get user's playlists | Yes |
| GET | `/api/playlists/:id` | Get playlist with songs | Yes |
| POST | `/api/playlists` | Create playlist | Yes |
| POST | `/api/playlists/:id/songs` | Add song to playlist | Yes |
| DELETE | `/api/playlists/:id/songs/:songId` | Remove song | Yes |
| DELETE | `/api/playlists/:id` | Delete playlist | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health status |

## UI Design

- **Dark theme** with Spotify-inspired black and green color scheme
- **Fixed sidebar** navigation on the left
- **Fixed player bar** at the bottom with full playback controls
- **Main content area** with gradient backgrounds
- **Responsive** song list with hover interactions
