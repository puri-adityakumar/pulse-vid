import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
}

export const extractVideoMetadata = (filePath: string): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error extracting video metadata:', err);
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      
      const result: VideoMetadata = {};

      if (videoStream) {
        if (videoStream.duration) {
          result.duration = parseFloat(videoStream.duration);
        }
        if (videoStream.width) {
          result.width = videoStream.width;
        }
        if (videoStream.height) {
          result.height = videoStream.height;
        }
      }

      resolve(result);
    });
  });
};
