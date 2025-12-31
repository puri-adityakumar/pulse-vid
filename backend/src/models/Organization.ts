import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  settings: {
    maxVideoSize: number;
    allowedFormats: string[];
  };
}

const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  settings: {
    maxVideoSize: {
      type: Number,
      default: 524288000
    },
    allowedFormats: {
      type: [String],
      default: ['video/mp4', 'video/avi', 'video/mov', 'video/mkv']
    }
  }
}, { timestamps: true });

const Organization: Model<IOrganization> = mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;
