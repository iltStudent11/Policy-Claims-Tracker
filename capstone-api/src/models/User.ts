import bcrypt from 'bcrypt';
import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type UserRole = 'adjuster' | 'admin';

export interface User {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<User, Record<string, never>, UserMethods>;
type UserDocument = HydratedDocument<User, UserMethods>;

const userSchema = new Schema<User, UserModel, UserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['adjuster', 'admin'],
      default: 'adjuster',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Partial<User>) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function hashPassword() {
  const user = this as UserDocument;

  if (!user.isModified('password')) {
    return;
  }

  user.password = await bcrypt.hash(user.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

const UserModel =
  (mongoose.models.User as UserModel | undefined) || mongoose.model<User, UserModel>('User', userSchema);

export default UserModel;
