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
