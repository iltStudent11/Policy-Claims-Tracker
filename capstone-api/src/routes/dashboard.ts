import { Router } from 'express';
import authMiddleware from '../middleware/auth';
import ClaimModel from '../models/Claim';
import PolicyModel from '../models/Policy';
import UserModel from '../models/User';

const dashboardRouter = Router();

dashboardRouter.get('/', authMiddleware, async (_req, res, next) => {
  try {
    const [
      totalClaims,
      totalPolicies,
      totalUsers,
      claimsSummary,
      claimsByStatusAgg,
      policiesByTypeAgg,
      recentClaims,
    ] = await Promise.all([
      ClaimModel.countDocuments(),
      PolicyModel.countDocuments(),
      UserModel.countDocuments(),
      ClaimModel.aggregate([
        {
          $group: {
            _id: null,
            totalClaimAmount: { $sum: '$amount' },
          },
        },
      ]),
      ClaimModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      PolicyModel.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
      ClaimModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('policy', 'policyNumber holderName type status')
        .populate('assignedTo', 'name email role'),
    ]);

    const claimsByStatus = claimsByStatusAgg.reduce<Record<string, number>>((acc, item) => {
      acc[String(item._id)] = Number(item.count);
      return acc;
    }, {});

    const policiesByType = policiesByTypeAgg.reduce<Record<string, number>>((acc, item) => {
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
  } catch (error) {
    return next(error);
  }
});

export default dashboardRouter;
