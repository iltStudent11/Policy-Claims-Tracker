import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Types } from 'mongoose';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import authorize from '../middleware/authorize';
import validate from '../middleware/validate';
import PolicyModel from '../models/Policy';

const policiesRouter = Router();

const normalizePolicyNumber = (value: string): string => {
  const normalizedValue = value.trim().toUpperCase();
  return normalizedValue.startsWith('POL-') ? normalizedValue : `POL-${normalizedValue}`;
};

const holderNamePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

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
  authorize('admin'),
  validate([
    body('policyNumber')
      .trim()
      .notEmpty()
      .withMessage('policyNumber is required')
      .isLength({ min: 3, max: 30 })
      .withMessage('policyNumber must be between 3 and 30 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('policyNumber can only contain letters, numbers, and hyphens')
      .toUpperCase(),
    body('holderName')
      .trim()
      .notEmpty()
      .withMessage('holderName is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('holderName must be between 2 and 100 characters')
      .matches(holderNamePattern)
      .withMessage("holderName may only contain letters, spaces, hyphens, and apostrophes"),
    body('type').isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    body('premium').isFloat({ min: 0 }).withMessage('premium must be a number greater than or equal to 0'),
    body('status')
      .isIn(['active', 'expired', 'cancelled'])
      .withMessage('status must be one of active, expired, cancelled'),
    body('effectiveDate').isISO8601().withMessage('effectiveDate must be a valid date'),
    body('expirationDate')
      .isISO8601()
      .withMessage('expirationDate must be a valid date')
      .custom((expirationDate, { req }) => {
        const effectiveDate = req.body.effectiveDate;

        if (!effectiveDate) {
          return true;
        }

        const effective = new Date(effectiveDate);
        const expiration = new Date(expirationDate);

        if (expiration <= effective) {
          throw new Error('expirationDate must be after effectiveDate');
        }

        return true;
      }),
  ]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const policy = await PolicyModel.create({
        ...req.body,
        policyNumber: normalizePolicyNumber(String(req.body.policyNumber || '')),
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
  authorize('admin'),
  validate([
    param('id').isMongoId().withMessage('Invalid policy id'),
    body('policyNumber')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('policyNumber cannot be empty')
      .isLength({ min: 3, max: 30 })
      .withMessage('policyNumber must be between 3 and 30 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('policyNumber can only contain letters, numbers, and hyphens')
      .toUpperCase(),
    body('holderName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('holderName cannot be empty')
      .isLength({ min: 2, max: 100 })
      .withMessage('holderName must be between 2 and 100 characters')
      .matches(holderNamePattern)
      .withMessage("holderName may only contain letters, spaces, hyphens, and apostrophes"),
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
    body().custom((_, { req }) => {
      const { effectiveDate, expirationDate } = req.body as {
        effectiveDate?: string;
        expirationDate?: string;
      };

      if (!effectiveDate || !expirationDate) {
        return true;
      }

      const effective = new Date(effectiveDate);
      const expiration = new Date(expirationDate);

      if (expiration <= effective) {
        throw new Error('expirationDate must be after effectiveDate');
      }

      return true;
    }),
  ]),
  async (req, res, next) => {
    try {
      const updates = { ...req.body } as Record<string, unknown>;
      delete updates.owner;

      if (typeof updates.policyNumber === 'string') {
        updates.policyNumber = normalizePolicyNumber(updates.policyNumber);
      }

      const policy = await PolicyModel.findByIdAndUpdate(req.params.id, updates, {
        returnDocument: 'after',
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
  authorize('admin'),
  validate([param('id').isMongoId().withMessage('Invalid policy id')]),
  async (req, res, next) => {
    try {
      const policy = await PolicyModel.findByIdAndDelete(req.params.id);

      if (!policy) {
        return res.status(404).json({ message: 'Policy not found' });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

export default policiesRouter;
