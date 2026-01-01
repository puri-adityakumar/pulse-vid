import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import Video, { IVideo } from '../models/Video';
import { emitToUser } from '../config/socket';
import supabase from '../config/supabase';
import { uploadToSupabase } from './supabaseStorage';

export interface ProcessVideoOptions {
  videoId: string;
  userId: string;
  inputPath: string;
  filename: string;
}

export const processVideo = async (options: ProcessVideoOptions): Promise<void> => {
  const { videoId, userId, inputPath, filename } = options;

  console.log(`Starting video processing: ${videoId}`);

  try {
    const video = await Video.findById(videoId);
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

    const baseName = path.parse(filename).name;
    const processedFilename = `${baseName}_processed.mp4`;
    const thumbnailFilename = `${baseName}_thumbnail.jpg`;

    let lastProgressUpdate = 0;
    let ffmpegAvailable = true;

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(processedFilename)
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

            const updatedVideo = await Video.findById(videoId);
            if (!updatedVideo) {
              reject(new Error('Video not found'));
              return;
            }

            const processedBuffer = fs.readFileSync(processedFilename);
            const { path: processedPath, url: processedUrl } = await uploadToSupabase(
              processedBuffer,
              processedFilename,
              updatedVideo.supabaseBucket
            );

            console.log('Processed video uploaded to Supabase:', processedUrl);
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
        ffmpeg(inputPath)
          .screenshots({
            count: 1,
            filename: thumbnailFilename,
            size: '320x?',
            timemarks: ['5']
          })
          .on('end', async () => {
            console.log('Thumbnail extracted');

            const thumbnailBuffer = fs.readFileSync(thumbnailFilename);
            const { path: thumbPath, url: thumbUrl } = await uploadToSupabase(
              thumbnailBuffer,
              thumbnailFilename,
              updatedVideo.supabaseBucket
            );

            console.log('Thumbnail uploaded to Supabase:', thumbUrl);

            const finalVideo = await Video.findById(videoId);
            if (!finalVideo) {
              reject(new Error('Video not found'));
              return;
            }

            await Video.findByIdAndUpdate(videoId, {
              processedPath: finalVideo.processedPath || processedPath,
              thumbnailPath: thumbPath,
              processingStatus: 'completed',
              processingProgress: 100
            });

            emitToUser(userId, 'video:processing:complete', {
              videoId,
              processedPath: finalVideo.processedPath || processedPath,
              thumbnailPath: thumbPath
            });

            console.log(`Video processing completed successfully: ${videoId}`);
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
  }
};
