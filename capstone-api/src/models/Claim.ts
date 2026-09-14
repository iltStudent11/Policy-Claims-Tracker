import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';
import CounterModel from './Counter';

export type ClaimStatus = 'submitted' | 'under-review' | 'approved' | 'denied' | 'closed';

export interface ClaimNote {
  author: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface Claim {
  claimNumber: string;
  policy: mongoose.Types.ObjectId;
  description: string;
  incidentDate: Date;
  amount: number;
  status: ClaimStatus;
  assignedTo?: mongoose.Types.ObjectId;
  notes: ClaimNote[];
  createdAt: Date;
  updatedAt: Date;
}

type ClaimModel = Model<Claim>;
type ClaimDocument = HydratedDocument<Claim>;

const claimNoteSchema = new Schema<ClaimNote>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const claimSchema = new Schema<Claim, ClaimModel>(
  {
    claimNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    policy: {
      type: Schema.Types.ObjectId,
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
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    status: {
      type: String,
      enum: ['submitted', 'under-review', 'approved', 'denied', 'closed'],
      default: 'submitted',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: [claimNoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

claimSchema.pre('save', async function assignClaimNumber() {
  const claim = this as ClaimDocument;

  if (!claim.isNew || claim.claimNumber) {
    return;
  }

  const counter = await CounterModel.findByIdAndUpdate(
    'claimNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const sequence = counter?.seq ?? 1;
  claim.claimNumber = `CLM-${1000 + sequence}`;
});

const ClaimModel =
  (mongoose.models.Claim as ClaimModel | undefined) ||
  mongoose.model<Claim, ClaimModel>('Claim', claimSchema);

export default ClaimModel;
