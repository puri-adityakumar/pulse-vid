import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVideo extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadPath: string;
  processedPath?: string;
  thumbnailPath?: string;
  supabaseBucket: string;
  duration?: number;
  width?: number;
  height?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  processingError?: string;
  uploadDate: Date;
}

const videoSchema = new Schema<IVideo>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadPath: {
    type: String,
    required: true
  },
  processedPath: {
    type: String
  },
  thumbnailPath: {
    type: String
  },
  supabaseBucket: {
    type: String,
    required: true
  },
  duration: {
    type: Number
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingProgress: {
    type: Number,
    default: 0
  },
  processingError: {
    type: String
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

videoSchema.index({ userId: 1, organizationId: 1 });
videoSchema.index({ processingStatus: 1 });

const Video: Model<IVideo> = mongoose.model<IVideo>('Video', videoSchema);

export default Video;
