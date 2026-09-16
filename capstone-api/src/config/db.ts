import mongoose from 'mongoose';

const connectDb = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/policy-claims';
  await mongoose.connect(mongoUri);
};

export default connectDb;
