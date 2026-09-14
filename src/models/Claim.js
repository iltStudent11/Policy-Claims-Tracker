const mongoose = require('mongoose');
const Counter = require('./Counter');

const claimNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    claimNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Policy',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    incidentDate: {
      type: Date,
      required: true,
    },
    claimedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['submitted', 'under-review', 'approved', 'denied', 'closed'],
      default: 'submitted',
    },
    assignedAdjuster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: [claimNoteSchema],
  },
  {
    timestamps: true,
  }
);

claimSchema.pre('validate', async function setClaimNumber() {
  if (!this.isNew || this.claimNumber) {
    return;
  }

  const counter = await Counter.findByIdAndUpdate(
    { _id: 'claimNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.claimNumber = `CLM-${1000 + counter.seq}`;
});

module.exports = mongoose.model('Claim', claimSchema);
