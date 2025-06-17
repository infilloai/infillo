import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password?: string;
  googleId?: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  refreshTokens: Array<{
    token: string;
    createdAt: Date;
  }>;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function(this: IUser) {
        return !this.googleId;
      },
      minlength: 6,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 604800, // 7 days
        },
      },
    ],
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
userSchema.index({ email: 1, googleId: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  delete user.__v;
  return user;
};

// Clean up expired refresh tokens
userSchema.methods.cleanExpiredTokens = function () {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(
    (tokenObj: any) => {
      const tokenAge = now.getTime() - tokenObj.createdAt.getTime();
      return tokenAge < 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    }
  );
};

const User = mongoose.model<IUser>('User', userSchema);

export default User; 