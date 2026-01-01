import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Video, { IVideo } from '../models/Video';
import { emitToUser } from '../config/socket';
import { uploadToSupabase, downloadFromSupabase } from './supabaseStorage';

export interface ProcessVideoOptions {
  videoId: string;
  userId: string;
  inputPath: string;
  filename: string;
}

export const processVideo = async (options: ProcessVideoOptions): Promise<void> => {
  const { videoId, userId, inputPath, filename } = options;

  console.log(`Starting video processing: ${videoId}`);

  const baseName = path.parse(filename).name;
  const processedFilename = `${baseName}_processed.mp4`;
  const thumbnailFilename = `${baseName}_thumbnail.jpg`;

  const tempDir = os.tmpdir();
  const localInputPath = path.join(tempDir, filename);

  try {
    const video = await Video.findById(videoId) as IVideo;
    if (!video) {
      throw new Error('Video not found');
    }

    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'processing',
      processingProgress: 0
    });

    emitToUser(userId, 'video:processing:started', {
      videoId,
      status: 'processing'
    });

    console.log(`Downloading video from Supabase: ${inputPath}`);

    const videoBuffer = await downloadFromSupabase(inputPath, video.supabaseBucket);
    fs.writeFileSync(localInputPath, videoBuffer);

    console.log(`Video downloaded to: ${localInputPath}`);

    let lastProgressUpdate = 0;
    let ffmpegAvailable = true;

    let processedPath: string = '';
    let thumbnailPath: string = '';

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(localInputPath)
          .output(path.join(tempDir, processedFilename))
          .videoCodec('libx264')
          .audioCodec('aac')
          .size('?x1080')
          .outputOptions([
            '-crf 23',
            '-preset medium',
            '-movflags +faststart'
          ])
          .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            const currentProgress = Math.floor(progress.percent || 0);

            if (currentProgress > lastProgressUpdate + 5) {
              lastProgressUpdate = currentProgress;
              console.log(`Processing progress: ${currentProgress}%`);

              Video.findByIdAndUpdate(videoId, {
                processingProgress: currentProgress
              }).catch(err => console.error('Failed to update progress:', err));

              emitToUser(userId, 'video:processing:progress', {
                videoId,
                progress: currentProgress
              });
            }
          })
          .on('end', async () => {
            console.log('Video processing completed');

            const currentVideo = await Video.findById(videoId) as IVideo;
            if (!currentVideo) {
              reject(new Error('Video not found'));
              return;
            }

            const processedBuffer = fs.readFileSync(path.join(tempDir, processedFilename));
            const { path: pPath, url: pUrl } = await uploadToSupabase(
              processedBuffer,
              processedFilename,
              currentVideo.supabaseBucket
            );

            processedPath = pPath;
            console.log('Processed video uploaded to Supabase:', pUrl);
            resolve();
          })
          .on('error', (err, stdout, stderr) => {
            console.error('FFmpeg error:', err);
            console.error('FFmpeg stderr:', stderr);

            if (err.message.includes('Cannot find ffmpeg') || err.message.includes('ENOENT')) {
              ffmpegAvailable = false;
              reject(err);
            } else {
              reject(err);
            }
          })
          .run();
      });
    } catch (error) {
      if (!ffmpegAvailable) {
        console.log('FFmpeg not available, skipping transcoding');
        await Video.findByIdAndUpdate(videoId, {
          processingStatus: 'completed',
          processingProgress: 100,
          processingError: 'FFmpeg not installed - video not transcoded'
        });

        emitToUser(userId, 'video:processing:complete', {
          videoId,
          processedPath: null,
          thumbnailPath: null,
          warning: 'FFmpeg not installed - video will play in original format'
        });

        console.log(`Video marked as completed without processing: ${videoId}`);
        return;
      }
      throw error;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(localInputPath)
          .screenshots({
            count: 1,
            filename: thumbnailFilename,
            size: '320x?',
            timemarks: ['5']
          })
          .on('end', async () => {
            console.log('Thumbnail extracted');

            const currentVideo = await Video.findById(videoId) as IVideo;
            if (!currentVideo) {
              reject(new Error('Video not found'));
              return;
            }

            const thumbnailBuffer = fs.readFileSync(path.join(tempDir, thumbnailFilename));
            const { path: tPath, url: tUrl } = await uploadToSupabase(
              thumbnailBuffer,
              thumbnailFilename,
              currentVideo.supabaseBucket
            );

            thumbnailPath = tPath;
            console.log('Thumbnail uploaded to Supabase:', tUrl);
            resolve();
          })
          .on('error', (err) => {
            console.error('Thumbnail extraction error:', err);
            if (err.message.includes('Cannot find ffprobe') || err.message.includes('ENOENT')) {
              console.log('FFprobe not available, skipping thumbnail');
              resolve();
            } else {
              reject(err);
            }
          });
      });
    } catch (error) {
      console.log('Thumbnail generation failed, continuing without it');
    }

    await Video.findByIdAndUpdate(videoId, {
      processedPath: processedPath,
      thumbnailPath: thumbnailPath,
      processingStatus: 'completed',
      processingProgress: 100
    });

    emitToUser(userId, 'video:processing:complete', {
      videoId,
      processedPath,
      thumbnailPath
    });

    console.log(`Video processing completed successfully: ${videoId}`);

  } catch (error) {
    console.error('Video processing error:', error);

    await Video.findByIdAndUpdate(videoId, {
      processingStatus: 'failed',
      processingError: (error as Error).message
    });

    emitToUser(userId, 'video:processing:failed', {
      videoId,
      error: (error as Error).message
    });
  } finally {
    if (fs.existsSync(localInputPath)) {
      fs.unlinkSync(localInputPath);
      console.log(`Cleaned up temp file: ${localInputPath}`);
    }

    const processedFile = path.join(tempDir, processedFilename);
    if (fs.existsSync(processedFile)) {
      fs.unlinkSync(processedFile);
      console.log(`Cleaned up temp file: ${processedFile}`);
    }

    const thumbnailFile = path.join(tempDir, thumbnailFilename);
    if (fs.existsSync(thumbnailFile)) {
      fs.unlinkSync(thumbnailFile);
      console.log(`Cleaned up temp file: ${thumbnailFile}`);
    }
  }
};
