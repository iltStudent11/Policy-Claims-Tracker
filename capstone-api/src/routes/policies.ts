import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Types } from 'mongoose';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import validate from '../middleware/validate';
import PolicyModel from '../models/Policy';

const policiesRouter = Router();

policiesRouter.use(authMiddleware);

policiesRouter.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('page must be an integer greater than 0'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('type').optional().isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    query('status')
      .optional()
      .isIn(['active', 'expired', 'cancelled'])
      .withMessage('status must be one of active, expired, cancelled'),
    query('search').optional().isString().withMessage('search must be a string'),
  ]),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const skip = (page - 1) * limit;

      const filters: Record<string, unknown> = {};

      if (req.query.type) {
        filters.type = req.query.type;
      }

      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.search) {
        const searchValue = String(req.query.search).trim();
        filters.$or = [
          { holderName: { $regex: searchValue, $options: 'i' } },
          { policyNumber: { $regex: searchValue, $options: 'i' } },
        ];
      }

      const [policies, total] = await Promise.all([
        PolicyModel.find(filters)
          .populate('owner', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        PolicyModel.countDocuments(filters),
      ]);

      return res.status(200).json({
        data: policies,
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

policiesRouter.get(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid policy id')]),
  async (req, res, next) => {
    try {
      const policy = await PolicyModel.findById(req.params.id).populate('owner', 'name email role');

      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      return res.status(200).json({ data: policy });
    } catch (error) {
      return next(error);
    }
  }
);

policiesRouter.post(
  '/',
  validate([
    body('policyNumber').notEmpty().withMessage('policyNumber is required'),
    body('holderName').notEmpty().withMessage('holderName is required'),
    body('type').isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    body('premium').isFloat({ min: 0 }).withMessage('premium must be a number greater than or equal to 0'),
    body('status')
      .isIn(['active', 'expired', 'cancelled'])
      .withMessage('status must be one of active, expired, cancelled'),
    body('effectiveDate').isISO8601().withMessage('effectiveDate must be a valid date'),
    body('expirationDate').isISO8601().withMessage('expirationDate must be a valid date'),
  ]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const policy = await PolicyModel.create({
        ...req.body,
        owner: req.user?._id,
      });

      const populatedPolicy = await policy.populate('owner', 'name email role');

      return res.status(201).json({ data: populatedPolicy });
    } catch (error) {
      return next(error);
    }
  }
);

policiesRouter.put(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid policy id'),
    body('policyNumber').optional().notEmpty().withMessage('policyNumber cannot be empty'),
    body('holderName').optional().notEmpty().withMessage('holderName cannot be empty'),
    body('type').optional().isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    body('premium')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('premium must be a number greater than or equal to 0'),
    body('status')
      .optional()
      .isIn(['active', 'expired', 'cancelled'])
      .withMessage('status must be one of active, expired, cancelled'),
    body('effectiveDate').optional().isISO8601().withMessage('effectiveDate must be a valid date'),
    body('expirationDate').optional().isISO8601().withMessage('expirationDate must be a valid date'),
  ]),
  async (req, res, next) => {
    try {
      const updates = { ...req.body } as Record<string, unknown>;
      delete updates.owner;

      const policy = await PolicyModel.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      }).populate('owner', 'name email role');

      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      return res.status(200).json({ data: policy });
    } catch (error) {
      return next(error);
    }
  }
);

policiesRouter.delete(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid policy id')]),
  async (req, res, next) => {
    try {
      const policy = await PolicyModel.findByIdAndDelete(req.params.id);

      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      return res.status(200).json({ message: 'Policy deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default policiesRouter;
