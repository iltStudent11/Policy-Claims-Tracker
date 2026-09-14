import { Router } from 'express';
import { body, param, query } from 'express-validator';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import validate from '../middleware/validate';
import ClaimModel from '../models/Claim';
import PolicyModel from '../models/Policy';

const claimsRouter = Router();

claimsRouter.use(authMiddleware);

claimsRouter.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('page must be an integer greater than 0'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['submitted', 'under-review', 'approved', 'denied', 'closed'])
      .withMessage('status must be one of submitted, under-review, approved, denied, closed'),
    query('policy').optional().isMongoId().withMessage('policy must be a valid id'),
    query('assignedTo').optional().isMongoId().withMessage('assignedTo must be a valid id'),
    query('search').optional().isString().withMessage('search must be a string'),
  ]),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const skip = (page - 1) * limit;

      const filters: Record<string, unknown> = {};

      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.policy) {
        filters.policy = req.query.policy;
      }

      if (req.query.assignedTo) {
        filters.assignedTo = req.query.assignedTo;
      }

      if (req.query.search) {
        const searchValue = String(req.query.search).trim();
        filters.$or = [
          { claimNumber: { $regex: searchValue, $options: 'i' } },
          { description: { $regex: searchValue, $options: 'i' } },
        ];
      }

      const [claims, total] = await Promise.all([
        ClaimModel.find(filters)
          .populate('policy', 'policyNumber holderName type status')
          .populate('assignedTo', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        ClaimModel.countDocuments(filters),
      ]);

      return res.status(200).json({
        data: claims,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

claimsRouter.get('/stats', async (_req, res, next) => {
  try {
    const [summary, statusCounts] = await Promise.all([
      ClaimModel.aggregate([
        {
          $group: {
            _id: null,
            totalClaims: { $sum: 1 },
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
    ]);

    const countByStatus = statusCounts.reduce<Record<string, number>>((acc, item) => {
      acc[item._id as string] = item.count as number;
      return acc;
    }, {});

    return res.status(200).json({
      data: {
        totalClaims: summary[0]?.totalClaims ?? 0,
        totalClaimAmount: summary[0]?.totalClaimAmount ?? 0,
        countByStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

claimsRouter.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid claim id')]),
  async (req, res, next) => {
    try {
      const claim = await ClaimModel.findById(req.params.id)
        .populate('policy', 'policyNumber holderName type status effectiveDate expirationDate')
        .populate('assignedTo', 'name email role')
        .populate('notes.author', 'name email role');

      if (!claim) {
        return res.status(404).json({ message: 'Claim not found' });
      }

      return res.status(200).json({ data: claim });
    } catch (error) {
      return next(error);
    }
  }
);

claimsRouter.post(
  '/',
  validate([
    body('policy').isMongoId().withMessage('policy is required and must be a valid id'),
    body('description').notEmpty().withMessage('description is required'),
    body('incidentDate').isISO8601().withMessage('incidentDate must be a valid date'),
    body('amount').isFloat({ min: 0 }).withMessage('amount must be a number greater than or equal to 0'),
    body('status')
      .optional()
      .isIn(['submitted', 'under-review', 'approved', 'denied', 'closed'])
      .withMessage('status must be one of submitted, under-review, approved, denied, closed'),
  ]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const policyExists = await PolicyModel.exists({ _id: req.body.policy });
      if (!policyExists) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      const claim = await ClaimModel.create({
        ...req.body,
        assignedTo: req.user?._id,
      });

      const populatedClaim = await claim.populate([
        { path: 'policy', select: 'policyNumber holderName type status' },
        { path: 'assignedTo', select: 'name email role' },
        { path: 'notes.author', select: 'name email role' },
      ]);

      return res.status(201).json({ data: populatedClaim });
    } catch (error) {
      return next(error);
    }
  }
);

claimsRouter.put(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid claim id'),
    body('policy').optional().isMongoId().withMessage('policy must be a valid id'),
    body('description').optional().notEmpty().withMessage('description cannot be empty'),
    body('incidentDate').optional().isISO8601().withMessage('incidentDate must be a valid date'),
    body('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('amount must be a number greater than or equal to 0'),
    body('status')
      .optional()
      .isIn(['submitted', 'under-review', 'approved', 'denied', 'closed'])
      .withMessage('status must be one of submitted, under-review, approved, denied, closed'),
    body('assignedTo').optional().isMongoId().withMessage('assignedTo must be a valid id'),
  ]),
  async (req, res, next) => {
    try {
      const updates = { ...req.body } as Record<string, unknown>;
      delete updates.claimNumber;
      delete updates.notes;

      if (updates.policy) {
        const policyExists = await PolicyModel.exists({ _id: updates.policy });
        if (!policyExists) {
          return res.status(404).json({ message: 'Policy not found' });
        }
      }

      const claim = await ClaimModel.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('policy', 'policyNumber holderName type status')
        .populate('assignedTo', 'name email role')
        .populate('notes.author', 'name email role');

      if (!claim) {
        return res.status(404).json({ message: 'Claim not found' });
      }

      return res.status(200).json({ data: claim });
    } catch (error) {
      return next(error);
    }
  }
);

claimsRouter.post(
  '/:id/notes',
  validate([
    param('id').isMongoId().withMessage('Invalid claim id'),
    body('text').isString().trim().notEmpty().withMessage('text is required'),
  ]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const claim = await ClaimModel.findById(req.params.id);

      if (!claim) {
        return res.status(404).json({ message: 'Claim not found' });
      }

      claim.notes.push({
        author: req.user!._id,
        text: String(req.body.text).trim(),
        createdAt: new Date(),
      });

      await claim.save();

      const populatedClaim = await claim.populate([
        { path: 'policy', select: 'policyNumber holderName type status' },
        { path: 'assignedTo', select: 'name email role' },
        { path: 'notes.author', select: 'name email role' },
      ]);

      return res.status(200).json({ data: populatedClaim });
    } catch (error) {
      return next(error);
    }
  }
);

claimsRouter.delete(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid claim id')]),
  async (req, res, next) => {
    try {
      const claim = await ClaimModel.findByIdAndDelete(req.params.id);

      if (!claim) {
        return res.status(404).json({ message: 'Claim not found' });
      }

      return res.status(200).json({ message: 'Claim deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default claimsRouter;
