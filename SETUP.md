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

## Supabase RLS Policy Fix

### Issue: "new row violates row-level security policy"

This error occurs because Row-Level Security (RLS) is blocking the upload.

### Solution Options:

#### Option 1: Disable RLS (Not Recommended for Production)

1. Go to your Supabase project dashboard
2. Navigate to Storage → Select your bucket (e.g., "dump")
3. Click "Edit" on the bucket
4. Disable "Enable RLS"
5. Click "Save"

#### Option 2: Create Proper RLS Policies (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to Storage → Select your bucket (e.g., "dump")
3. Go to Policies tab
4. Click "New Policy" → "For full customization"
5. Use this SQL for INSERT policy:

```sql
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'dump');
```

6. Use this SQL for SELECT policy (if needed):

```sql
CREATE POLICY "Allow authenticated reads" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'dump');
```

### Verify Your Bucket Exists

1. Go to Storage in Supabase dashboard
2. Make sure your bucket (default: "dump") exists
3. If not, create it with: Storage → New bucket → Name: "dump" → Public bucket: Yes

## Testing Video Upload

After fixing the Supabase RLS policy:

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Login
5. Go to video upload page
6. Upload a video file

Expected behavior:
- Video uploads to Supabase
- Video is queued for processing
- Processing status updates via Socket.io
- Video appears in your dashboard

## Common Issues

### FFprobe not found after installation
- Restart your terminal/command prompt
- Check PATH variable includes FFmpeg bin directory
- Run `ffmpeg -version` to verify

### Supabase upload still fails
- Verify bucket exists
- Check RLS policies are enabled/created
- Ensure SUPABASE_URL and SUPABASE_ANON_KEY in backend .env are correct
- Check Supabase logs for detailed error messages

### Socket.io not connecting
- Verify VITE_SOCKET_URL in frontend .env matches backend URL
- Check backend logs for Socket.io initialization
- Ensure Socket.io server is running before frontend connects
