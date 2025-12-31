import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  organizationId: mongoose.Types.ObjectId;
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: mongoose.Schema<IUser> = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  role: {
    type: String,
    enum: ['viewer', 'editor', 'admin'],
    default: 'viewer'
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

(userSchema as any).pre('save', async function(this: IUser, next: any) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

(userSchema as any).methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
