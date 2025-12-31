import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVideo extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadPath: string;
  duration?: number;
  width?: number;
  height?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
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
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

videoSchema.index({ userId: 1, organizationId: 1 });
videoSchema.index({ processingStatus: 1 });

const Video: Model<IVideo> = mongoose.model<IVideo>('Video', videoSchema);

export default Video;
