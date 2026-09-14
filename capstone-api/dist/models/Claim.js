"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const Counter_1 = __importDefault(require("./Counter"));
const claimNoteSchema = new mongoose_1.Schema({
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { _id: false });
const claimSchema = new mongoose_1.Schema({
    claimNumber: {
        type: String,
        unique: true,
        trim: true,
    },
    policy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    notes: {
        type: [claimNoteSchema],
        default: [],
    },
}, {
    timestamps: true,
});
claimSchema.pre('save', async function assignClaimNumber() {
    const claim = this;
    if (!claim.isNew || claim.claimNumber) {
        return;
    }
    const counter = await Counter_1.default.findByIdAndUpdate('claimNumber', { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const sequence = counter?.seq ?? 1;
    claim.claimNumber = `CLM-${1000 + sequence}`;
});
const ClaimModel = mongoose_1.default.models.Claim ||
    mongoose_1.default.model('Claim', claimSchema);
exports.default = ClaimModel;
