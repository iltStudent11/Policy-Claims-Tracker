"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = __importDefault(require("../middleware/auth"));
const validate_1 = __importDefault(require("../middleware/validate"));
const Claim_1 = __importDefault(require("../models/Claim"));
const Policy_1 = __importDefault(require("../models/Policy"));
const claimsRouter = (0, express_1.Router)();
claimsRouter.use(auth_1.default);
claimsRouter.get('/', (0, validate_1.default)([
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be an integer greater than 0'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['submitted', 'under-review', 'approved', 'denied', 'closed'])
        .withMessage('status must be one of submitted, under-review, approved, denied, closed'),
    (0, express_validator_1.query)('policy').optional().isMongoId().withMessage('policy must be a valid id'),
    (0, express_validator_1.query)('assignedTo').optional().isMongoId().withMessage('assignedTo must be a valid id'),
    (0, express_validator_1.query)('search').optional().isString().withMessage('search must be a string'),
]), async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);
        const skip = (page - 1) * limit;
        const filters = {};
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
            Claim_1.default.find(filters)
                .populate('policy', 'policyNumber holderName type status')
                .populate('assignedTo', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Claim_1.default.countDocuments(filters),
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
    }
    catch (error) {
        return next(error);
    }
});
claimsRouter.get('/stats', async (_req, res, next) => {
    try {
        const [summary, statusCounts] = await Promise.all([
            Claim_1.default.aggregate([
                {
                    $group: {
                        _id: null,
                        totalClaims: { $sum: 1 },
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
        ]);
        const countByStatus = statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        return res.status(200).json({
            data: {
                totalClaims: summary[0]?.totalClaims ?? 0,
                totalClaimAmount: summary[0]?.totalClaimAmount ?? 0,
                countByStatus,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
claimsRouter.get('/:id', (0, validate_1.default)([(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid claim id')]), async (req, res, next) => {
    try {
        const claim = await Claim_1.default.findById(req.params.id)
            .populate('policy', 'policyNumber holderName type status effectiveDate expirationDate')
            .populate('assignedTo', 'name email role')
            .populate('notes.author', 'name email role');
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }
        return res.status(200).json({ data: claim });
    }
    catch (error) {
        return next(error);
    }
});
claimsRouter.post('/', (0, validate_1.default)([
    (0, express_validator_1.body)('policy').isMongoId().withMessage('policy is required and must be a valid id'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('description is required'),
    (0, express_validator_1.body)('incidentDate').isISO8601().withMessage('incidentDate must be a valid date'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('amount must be a number greater than or equal to 0'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['submitted', 'under-review', 'approved', 'denied', 'closed'])
        .withMessage('status must be one of submitted, under-review, approved, denied, closed'),
]), async (req, res, next) => {
    try {
        const policyExists = await Policy_1.default.exists({ _id: req.body.policy });
        if (!policyExists) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        const claim = await Claim_1.default.create({
            ...req.body,
            assignedTo: req.user?._id,
        });
        const populatedClaim = await claim.populate([
            { path: 'policy', select: 'policyNumber holderName type status' },
            { path: 'assignedTo', select: 'name email role' },
            { path: 'notes.author', select: 'name email role' },
        ]);
        return res.status(201).json({ data: populatedClaim });
    }
    catch (error) {
        return next(error);
    }
});
claimsRouter.put('/:id', (0, validate_1.default)([
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid claim id'),
    (0, express_validator_1.body)('policy').optional().isMongoId().withMessage('policy must be a valid id'),
    (0, express_validator_1.body)('description').optional().notEmpty().withMessage('description cannot be empty'),
    (0, express_validator_1.body)('incidentDate').optional().isISO8601().withMessage('incidentDate must be a valid date'),
    (0, express_validator_1.body)('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('amount must be a number greater than or equal to 0'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['submitted', 'under-review', 'approved', 'denied', 'closed'])
        .withMessage('status must be one of submitted, under-review, approved, denied, closed'),
    (0, express_validator_1.body)('assignedTo').optional().isMongoId().withMessage('assignedTo must be a valid id'),
]), async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates.claimNumber;
        delete updates.notes;
        if (updates.policy) {
            const policyExists = await Policy_1.default.exists({ _id: updates.policy });
            if (!policyExists) {
                return res.status(404).json({ message: 'Policy not found' });
            }
        }
        const claim = await Claim_1.default.findByIdAndUpdate(req.params.id, updates, {
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
    }
    catch (error) {
        return next(error);
    }
});
claimsRouter.post('/:id/notes', (0, validate_1.default)([
    (0, express_validator_1.param)('id').isMongoId().withMessage('Invalid claim id'),
    (0, express_validator_1.body)('text').isString().trim().notEmpty().withMessage('text is required'),
]), async (req, res, next) => {
    try {
        const claim = await Claim_1.default.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }
        claim.notes.push({
            author: req.user._id,
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
    }
    catch (error) {
        return next(error);
    }
});
claimsRouter.delete('/:id', (0, validate_1.default)([(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid claim id')]), async (req, res, next) => {
    try {
        const claim = await Claim_1.default.findByIdAndDelete(req.params.id);
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }
        return res.status(200).json({ message: 'Claim deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = claimsRouter;
