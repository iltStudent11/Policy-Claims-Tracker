const mongoose = require('mongoose');

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/policy-claims';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

module.exports = connectDatabase;
