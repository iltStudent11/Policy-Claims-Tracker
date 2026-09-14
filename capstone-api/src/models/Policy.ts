import mongoose, { Model, Schema } from 'mongoose';

export type PolicyType = 'auto' | 'home' | 'life';
export type PolicyStatus = 'active' | 'expired' | 'cancelled';

export interface Policy {
  policyNumber: string;
  holderName: string;
  type: PolicyType;
  premium: number;
  status: PolicyStatus;
  effectiveDate: Date;
  expirationDate: Date;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
}

type PolicyModel = Model<Policy>;

const policySchema = new Schema<Policy, PolicyModel>(
  {
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    holderName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['auto', 'home', 'life'],
      required: true,
    },
    premium: {
      type: Number,
      min: 0,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      required: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const PolicyModel =
  (mongoose.models.Policy as PolicyModel | undefined) ||
  mongoose.model<Policy, PolicyModel>('Policy', policySchema);

export default PolicyModel;
