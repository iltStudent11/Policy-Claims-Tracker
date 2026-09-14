"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("../middleware/auth"));
const Claim_1 = __importDefault(require("../models/Claim"));
const Policy_1 = __importDefault(require("../models/Policy"));
const User_1 = __importDefault(require("../models/User"));
const dashboardRouter = (0, express_1.Router)();
dashboardRouter.get('/', auth_1.default, async (_req, res, next) => {
    try {
        const [totalClaims, totalPolicies, totalUsers, claimsSummary, claimsByStatusAgg, policiesByTypeAgg, recentClaims,] = await Promise.all([
            Claim_1.default.countDocuments(),
            Policy_1.default.countDocuments(),
            User_1.default.countDocuments(),
            Claim_1.default.aggregate([
                {
                    $group: {
                        _id: null,
                        totalClaimAmount: { $sum: '$amount' },
                    },
                },
            ]),
            Claim_1.default.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Policy_1.default.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Claim_1.default.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('policy', 'policyNumber holderName type status')
                .populate('assignedTo', 'name email role'),
        ]);
        const claimsByStatus = claimsByStatusAgg.reduce((acc, item) => {
            acc[String(item._id)] = Number(item.count);
            return acc;
        }, {});
        const policiesByType = policiesByTypeAgg.reduce((acc, item) => {
            acc[String(item._id)] = Number(item.count);
            return acc;
        }, {});
        return res.status(200).json({
            data: {
                totalClaims,
                claimsByStatus,
                totalPolicies,
                policiesByType,
                totalUsers,
                recentClaims,
                totalClaimAmount: claimsSummary[0]?.totalClaimAmount ?? 0,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = dashboardRouter;
