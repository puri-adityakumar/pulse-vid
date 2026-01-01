import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
}

export const extractVideoMetadata = async (input: string | Buffer): Promise<VideoMetadata> => {
  try {
    let inputPath: string;

    if (Buffer.isBuffer(input)) {
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `video-${Date.now()}.tmp`);
      fs.writeFileSync(tempFile, input);
      inputPath = tempFile;
    } else {
      inputPath = input as string;
    }

    const result = await new Promise<VideoMetadata>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');

        const metadataResult: VideoMetadata = {};

        if (videoStream) {
          if (videoStream.duration) {
            metadataResult.duration = parseFloat(videoStream.duration);
          }
          if (videoStream.width) {
            metadataResult.width = videoStream.width;
          }
          if (videoStream.height) {
            metadataResult.height = videoStream.height;
          }
        }

        resolve(metadataResult);
      });
    });

    if (Buffer.isBuffer(input) && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return result;
  } catch (error) {
    console.warn('FFprobe not available. Install FFmpeg to extract video metadata.');
    console.warn('Windows: Download from https://ffmpeg.org/download.html and add to PATH');
    console.warn('Mac: brew install ffmpeg');
    console.warn('Linux: sudo apt-get install ffmpeg');
    return {};
  }
};
