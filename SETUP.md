# Setup Guide

## FFmpeg Installation

### Windows

1. Download FFmpeg from https://ffmpeg.org/download.html#build-windows
2. Extract the zip file to a folder (e.g., `C:\ffmpeg`)
3. Add FFmpeg to your system PATH:
   - Right-click "This PC" → Properties → Advanced System Settings → Environment Variables
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add the path to your FFmpeg bin folder (e.g., `C:\ffmpeg\bin`)
   - Click OK on all dialogs
4. Restart your terminal/command prompt
5. Verify installation: `ffmpeg -version` and `ffprobe -version`

### macOS

```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

## Supabase RLS Policy Fix (REQUIRED)

### Issue: "new row violates row-level security policy"

This error occurs because Row-Level Security (RLS) is blocking upload. Even with service role key, Storage requires explicit RLS policies.

### Solution (Must be done in Supabase Dashboard)

#### Step 1: Create the bucket

1. Go to your Supabase project dashboard → Storage
2. Click "New bucket"
3. Name: `dump`
4. Public bucket: Yes
5. Click "Create bucket"

#### Step 2: Add RLS policies in SQL Editor

Go to **SQL Editor** in Supabase dashboard and run these commands:

```sql
-- Allow all INSERT operations (uploads)
CREATE POLICY "Allow uploads"
ON storage.objects
FOR INSERT
WITH CHECK (true);

-- Allow all SELECT operations (downloads/reads)
CREATE POLICY "Allow reads"
ON storage.objects
FOR SELECT
USING (true);

-- Allow all UPDATE operations
CREATE POLICY "Allow updates"
ON storage.objects
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow all DELETE operations
CREATE POLICY "Allow deletes"
ON storage.objects
FOR DELETE
USING (true);
```

**Alternative (More Secure):** Restrict to authenticated users only:
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dump');

CREATE POLICY "Allow authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'dump');
```

## Testing Video Upload

After fixing Supabase RLS policy:

### Option A: Using Docker (Recommended)

1. Start backend: `docker-compose -f docker-compose-simple.yml up -d --build`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Login
5. Go to video upload page
6. Upload a video file

### Option B: Local Development

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Login
5. Go to video upload page
6. Upload a video file

Expected behavior:
- Video uploads to Supabase Storage
- Video metadata extracted (duration, dimensions)
- Video is queued for processing
- Processing downloads video from Supabase, transcodes it, uploads back
- Thumbnail generated and uploaded
- Processing status updates via Socket.io (0% → 100%)
- Video appears in your dashboard with thumbnail

## Common Issues

### FFprobe not found after installation
- Restart your terminal/command prompt
- Check PATH variable includes FFmpeg bin directory
- Run `ffmpeg -version` to verify

### Supabase upload still fails
- Verify bucket "dump" exists in Storage section
- Run the SQL commands in SQL Editor to create RLS policies
- Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend .env are correct
- Check backend logs for detailed error messages
- Make sure bucket is public (for streaming)

### Video processing fails with "No such file or directory"
- Backend will now download video from Supabase before processing
- This should be fixed with the latest commit
- Check Docker logs: `docker logs pulse-vid-assesment-backend-1`

### Socket.io not connecting
- Verify VITE_SOCKET_URL in frontend .env matches backend URL
- Check backend logs for Socket.io initialization
- Ensure Socket.io server is running before frontend connects

## Deploy Backend to Render

### Prerequisites

1. **MongoDB Atlas**
   - ✓ Database cluster created
   - ✓ "Allow access from anywhere" in IP whitelist
   - ✓ Connection string ready

2. **Supabase**
   - ✓ Project created
   - ✓ Storage bucket "dump" exists
   - ✓ RLS policies configured (see above)
   - ✓ Service role key available

3. **GitHub**
   - ✓ Repository pushed with latest code
   - ✓ All changes committed

### Deployment Steps

#### Step 1: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the `pulse-vid-assesment` repository
5. Configure:

   **Name**: `pulse-video-backend` (or any name you prefer)

   **Runtime**: `Docker`

   **Build & Deploy**:
   - **Context**: `./backend`
   - **Dockerfile Path**: `Dockerfile`

   **Instance Type**:
   - **Free** (512MB RAM, 0.1 CPU) - *May be slow for video processing*
   - **Starter** ($7/mo, 2GB RAM) - *Recommended for video processing*

   **Region**: Select region closest to your users

6. Click **"Create Web Service"**

#### Step 2: Configure Environment Variables

After creating the service, add these environment variables in the Render dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `5000` | Required |
| `NODE_ENV` | `production` | Required |
| `MONGODB_URI` | `mongodb+srv://...` | Get from Atlas |
| `JWT_SECRET` | `<generate strong secret>` | Use password generator |
| `JWT_EXPIRE` | `24h` | Optional |
| `FRONTEND_URL` | `*` | CORS - all origins allowed |
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your-service-role-key>` | From Supabase dashboard |
| `SUPABASE_BUCKET` | `dump` | Your bucket name |
| `SUPABASE_PROJECT_ID` | `<your-project-id>` | From Supabase URL |

**Generating JWT_SECRET**:
```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 3: Verify Deployment

1. Wait for deployment to complete (green checkmark)
2. Click on the service URL (e.g., `https://pulse-video-backend.onrender.com`)
3. Test health endpoint: `https://your-url.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"...","uptime":...}`
4. Check logs in Render dashboard for any errors

#### Step 4: Update Frontend Configuration

In your frontend, update `VITE_API_URL`:

```env
# frontend/.env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

### Free Tier Limitations

Render's free tier has these limitations:

- **512MB RAM**: FFmpeg processing may fail with large videos
- **0.1 CPU**: Video processing will be slow
- **512MB Disk**: Ephemeral storage (wiped on redeploy)
  - This is OK because videos are stored in Supabase
  - Temp files are deleted after processing
- **Sleep**: Services sleep after 15min inactivity
  - Wakes up automatically on next request
  - May cause Socket.io disconnects

**Recommendation**: Upgrade to Starter plan ($7/mo) for production video processing.

### Troubleshooting Render Deployment

#### Build Fails

**Issue**: Docker build fails or times out
**Solution**:
- Check build logs in Render dashboard
- Ensure `Dockerfile` exists in `backend/` directory
- FFmpeg installation can be slow - try increasing timeout in Render settings

#### Health Check Fails

**Issue**: Health check endpoint fails
**Solution**:
- Check `/health` endpoint is accessible
- Verify backend logs for startup errors
- Ensure MongoDB connection is working

#### Video Processing Fails

**Issue**: Videos fail to process (out of memory, timeout)
**Solution**:
- Upgrade to Starter plan (more RAM/CPU)
- Reduce max file size in frontend
- Check logs: `ffmpeg exited with code 137` (OOM)

#### MongoDB Connection Fails

**Issue**: "MongoNetworkError" in logs
**Solution**:
- Verify MongoDB URI is correct
- Check Atlas IP whitelist includes "0.0.0.0/0" (all IPs)
- Ensure Atlas cluster is running (not paused)

#### Socket.io Connection Issues

**Issue**: Frontend can't connect to Socket.io
**Solution**:
- Ensure `VITE_SOCKET_URL` matches Render URL exactly
- Check CORS is set to `*` (already configured)
- Verify frontend URL is using HTTPS (Render requires it)

### Monitoring Your Deployment

**Render Dashboard**:
- View real-time logs
- Monitor CPU, memory, and disk usage
- Check deployment history
- Scale instances (paid plans)

**Health Check**:
- Access `https://your-url.onrender.com/health` anytime
- Returns: uptime, status, environment, services info

**Database Monitoring**:
- MongoDB Atlas: Real-time metrics, slow queries
- Supabase Dashboard: Storage usage, request logs
