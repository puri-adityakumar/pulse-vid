# Video Platform

A full-stack video upload, processing, and streaming platform with real-time progress tracking.

## Installation and Setup Guide

### Prerequisites

- Node.js v20 or higher
- MongoDB (local or Atlas)
- Supabase account (for storage)
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `.env` with your MongoDB URI and Supabase credentials:

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://your-atlas-connection-string/video-platform
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=24h
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=dump
SUPABASE_PROJECT_ID=your-project-id
```

Build and run:

```bash
npm run build
npm start

# Or with Docker
docker build -t video-platform-backend .
docker run -d -p 5000:5000 --env-file .env video-platform-backend
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Configure `.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Run the development server:

```bash
npm run dev
```

## API Documentation

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "viewer"
  }
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "viewer",
    "organizationId": "..."
  }
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```

### Videos

#### Upload Video
```
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

video: <file>
title: "My Video"
description: "Video description"
```

Response:
```json
{
  "success": true,
  "videoId": "video_123",
  "message": "Video uploaded successfully, processing started"
}
```

#### Get All Videos
```
GET /api/videos
Authorization: Bearer <token>
```

#### Get Video by ID
```
GET /api/videos/:id
Authorization: Bearer <token>
```

#### Stream Video
```
GET /api/videos/:id/stream
Authorization: Bearer <token>
```

#### Get Video Thumbnail
```
GET /api/videos/:id/thumbnail
```

### Admin

#### Create User
```
POST /api/admin/users
Authorization: Bearer <token> (admin role)
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "editor"
}
```

#### Get All Users
```
GET /api/admin/users
Authorization: Bearer <token> (admin role)
```

#### Update User
```
PUT /api/admin/users/:id
Authorization: Bearer <token> (admin role)
Content-Type: application/json

{
  "role": "admin",
  "isActive": true
}
```

#### Delete User
```
DELETE /api/admin/users/:id
Authorization: Bearer <token> (admin role)
```

## User Manual

### Roles and Permissions

**Viewer**
- View and stream videos
- View dashboard

**Editor**
- All viewer permissions
- Upload videos
- View processing progress
- Manage their own videos

**Admin**
- All editor permissions
- Manage users (create, update, delete)
- View all videos across organization

### Workflow

1. **Register/Login**: Create an account or log in with existing credentials
2. **Dashboard**: View all videos and their processing status
3. **Upload**: Upload video files with metadata (title, description)
4. **Processing**: Track real-time progress via WebSocket updates
5. **Streaming**: View processed videos with seek functionality

### Video Processing

Videos undergo the following processing steps:
1. Upload validation and storage
2. Format conversion (if needed)
3. Thumbnail generation
4. Metadata extraction
5. Final storage

Progress is streamed in real-time via Socket.io events.

## Architecture Overview

### Backend Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # MongoDB connection
│   │   ├── multer.ts    # File upload config
│   │   ├── socket.ts    # Socket.io config
│   │   └── supabase.ts  # Supabase storage config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth and role validation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── app.ts           # Express app setup
├── Dockerfile
└── package.json
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── auth/       # Authentication components
│   │   ├── ui/         # Reusable UI components
│   │   └── video/      # Video-related components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── pages/          # Page components
│   ├── services/       # API services
│   └── App.tsx         # Main app component
└── package.json
```

### Technology Stack

**Backend**
- Node.js v20
- Express v5
- TypeScript
- MongoDB (Mongoose)
- Socket.io
- FFmpeg (video processing)
- Supabase (storage)

**Frontend**
- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Socket.io-client

### Data Flow

1. User uploads video via frontend
2. Backend receives file, validates, stores in Supabase
3. Processing job queued with video ID
4. FFmpeg processes video (convert, generate thumbnail)
5. Real-time progress updates via Socket.io
6. Processed files stored in Supabase
7. Frontend streams video from Supabase CDN

## Assumptions and Design Decisions

### Assumptions

1. MongoDB Atlas is available and accessible
2. Supabase storage bucket is pre-configured
3. Maximum video size: 500MB per organization setting
4. Supported video formats: MP4, AVI, MOV, MKV
5. Default user role is "viewer"
6. All users belong to an organization (default: "Default Organization")
7. FFmpeg is available in the runtime environment
8. WebSocket connections are maintained during processing

### Design Decisions

**Storage Strategy**
- Development: Local filesystem (originals, processed, thumbnails)
- Production: Supabase Storage (CDN-backed)

**Authentication**
- JWT tokens for stateless authentication
- Token expiration: 24 hours
- Passwords hashed with bcrypt (10 rounds)

**Video Processing**
- Queue-based processing system
- Real-time progress updates via WebSocket
- Asynchronous processing to avoid blocking

**Multi-tenancy**
- Organization-based data isolation
- All queries filtered by organizationId
- Shared storage bucket with organization prefixes

**Error Handling**
- Consistent API response format
- Graceful degradation for non-critical failures
- Comprehensive logging for debugging

**Security**
- Helmet for HTTP headers
- CORS configured for frontend origin
- Role-based access control (RBAC)
- Input validation on all endpoints
- No sensitive data in logs

**Performance**
- Mongoose indexing on frequently queried fields
- Efficient file streaming with range requests
- Lazy loading of video data
- WebSocket for real-time updates (no polling)
