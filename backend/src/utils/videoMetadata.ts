import ffmpeg from 'fluent-ffmpeg';

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
}

export const extractVideoMetadata = async (input: string | Buffer): Promise<VideoMetadata> => {
  try {
    const result = await new Promise<VideoMetadata>((resolve, reject) => {
      ffmpeg.ffprobe(input, (err, metadata) => {
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

    return result;
  } catch (error) {
    console.log('FFprobe not available, using basic file metadata only');
    return {};
  }
};
