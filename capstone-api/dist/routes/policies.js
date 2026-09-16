"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = __importDefault(require("../middleware/auth"));
const validate_1 = __importDefault(require("../middleware/validate"));
const Policy_1 = __importDefault(require("../models/Policy"));
const policiesRouter = (0, express_1.Router)();
const normalizePolicyNumber = (value) => {
    const normalizedValue = value.trim().toUpperCase();
    return normalizedValue.startsWith('POL-') ? normalizedValue : `POL-${normalizedValue}`;
};
const holderNamePattern = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
policiesRouter.use(auth_1.default);
policiesRouter.get('/', (0, validate_1.default)([
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be an integer greater than 0'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    (0, express_validator_1.query)('type').optional().isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['active', 'expired', 'cancelled'])
        .withMessage('status must be one of active, expired, cancelled'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('search must be a string'),
]), async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);
        const skip = (page - 1) * limit;
        const filters = {};
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
            Policy_1.default.find(filters)
                .populate('owner', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Policy_1.default.countDocuments(filters),
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
    }
    catch (error) {
        return next(error);
    }
});
policiesRouter.get('/:id', (0, validate_1.default)([(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid policy id')]), async (req, res, next) => {
    try {
        const policy = await Policy_1.default.findById(req.params.id).populate('owner', 'name email role');
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        return res.status(200).json({ data: policy });
    }
    catch (error) {
        return next(error);
    }
});
policiesRouter.post('/', (0, validate_1.default)([
    (0, express_validator_1.body)('policyNumber')
        .trim()
        .notEmpty()
        .withMessage('policyNumber is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('policyNumber must be between 3 and 30 characters')
        .matches(/^[A-Za-z0-9-]+$/)
        .withMessage('policyNumber can only contain letters, numbers, and hyphens')
        .toUpperCase(),
    (0, express_validator_1.body)('holderName')
        .trim()
        .notEmpty()
        .withMessage('holderName is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('holderName must be between 2 and 100 characters')
        .matches(holderNamePattern)
        .withMessage("holderName may only contain letters, spaces, hyphens, and apostrophes"),
    (0, express_validator_1.body)('type').isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    (0, express_validator_1.body)('premium').isFloat({ min: 0 }).withMessage('premium must be a number greater than or equal to 0'),
    (0, express_validator_1.body)('status')
        .isIn(['active', 'expired', 'cancelled'])
        .withMessage('status must be one of active, expired, cancelled'),
    (0, express_validator_1.body)('effectiveDate').isISO8601().withMessage('effectiveDate must be a valid date'),
    (0, express_validator_1.body)('expirationDate')
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
]), async (req, res, next) => {
    try {
        const policy = await Policy_1.default.create({
            ...req.body,
            policyNumber: normalizePolicyNumber(String(req.body.policyNumber || '')),
            owner: req.user?._id,
        });
        const populatedPolicy = await policy.populate('owner', 'name email role');
        return res.status(201).json({ data: populatedPolicy });
    }
    catch (error) {
        return next(error);
    }
});
policiesRouter.put('/:id', (0, validate_1.default)([
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid policy id'),
    (0, express_validator_1.body)('policyNumber')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('policyNumber cannot be empty')
        .isLength({ min: 3, max: 30 })
        .withMessage('policyNumber must be between 3 and 30 characters')
        .matches(/^[A-Za-z0-9-]+$/)
        .withMessage('policyNumber can only contain letters, numbers, and hyphens')
        .toUpperCase(),
    (0, express_validator_1.body)('holderName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('holderName cannot be empty')
        .isLength({ min: 2, max: 100 })
        .withMessage('holderName must be between 2 and 100 characters')
        .matches(holderNamePattern)
        .withMessage("holderName may only contain letters, spaces, hyphens, and apostrophes"),
    (0, express_validator_1.body)('type').optional().isIn(['auto', 'home', 'life']).withMessage('type must be one of auto, home, life'),
    (0, express_validator_1.body)('premium')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('premium must be a number greater than or equal to 0'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['active', 'expired', 'cancelled'])
        .withMessage('status must be one of active, expired, cancelled'),
    (0, express_validator_1.body)('effectiveDate').optional().isISO8601().withMessage('effectiveDate must be a valid date'),
    (0, express_validator_1.body)('expirationDate').optional().isISO8601().withMessage('expirationDate must be a valid date'),
    (0, express_validator_1.body)().custom((_, { req }) => {
        const { effectiveDate, expirationDate } = req.body;
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
]), async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates.owner;
        if (typeof updates.policyNumber === 'string') {
            updates.policyNumber = normalizePolicyNumber(updates.policyNumber);
        }
        const policy = await Policy_1.default.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        }).populate('owner', 'name email role');
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        return res.status(200).json({ data: policy });
    }
    catch (error) {
        return next(error);
    }
});
policiesRouter.delete('/:id', (0, validate_1.default)([(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid policy id')]), async (req, res, next) => {
    try {
        const policy = await Policy_1.default.findByIdAndDelete(req.params.id);
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        return res.status(200).json({ message: 'Policy deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = policiesRouter;
