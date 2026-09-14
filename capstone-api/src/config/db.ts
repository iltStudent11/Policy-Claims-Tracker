import mongoose from 'mongoose';

const connectDb = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/capstone-api';
  await mongoose.connect(mongoUri);
};

export default connectDb;
