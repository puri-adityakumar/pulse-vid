import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import Video, { IVideo } from '../models/Video';
import { emitToUser } from '../config/socket';

const PROCESSED_DIR = process.env.PROCESSED_DIR || './uploads/processed';
const THUMBNAILS_DIR = process.env.THUMBNAILS_DIR || './uploads/thumbnails';

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

    const processedDir = PROCESSED_DIR;
    const thumbnailsDir = THUMBNAILS_DIR;

    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    const baseName = path.parse(filename).name;
    const processedFilename = `${baseName}_processed.mp4`;
    const processedPath = path.join(processedDir, processedFilename);
    const thumbnailFilename = `${baseName}_thumbnail.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

    let lastProgressUpdate = 0;
    let ffmpegAvailable = true;

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(processedPath)
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
            folder: thumbnailsDir,
            filename: thumbnailFilename,
            size: '320x?',
            timemarks: ['5']
          })
          .on('end', () => {
            console.log('Thumbnail extracted');
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

    const updatedVideo = await Video.findById(videoId);
    if (!updatedVideo) {
      throw new Error('Video not found');
    }

    await Video.findByIdAndUpdate(videoId, {
      processedPath: processedPath,
      thumbnailPath: thumbnailPath,
      processingStatus: 'completed',
      processingProgress: 100
    });

    emitToUser(userId, 'video:processing:complete', {
      videoId,
      processedPath: processedPath,
      thumbnailPath: thumbnailPath
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
  }
};
