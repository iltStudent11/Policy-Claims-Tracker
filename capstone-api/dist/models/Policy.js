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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const policySchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
const PolicyModel = mongoose_1.default.models.Policy ||
    mongoose_1.default.model('Policy', policySchema);
exports.default = PolicyModel;
