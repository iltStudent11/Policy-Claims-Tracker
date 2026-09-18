"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = __importDefault(require("../middleware/auth"));
const authorize_1 = __importDefault(require("../middleware/authorize"));
const validate_1 = __importDefault(require("../middleware/validate"));
const User_1 = __importDefault(require("../models/User"));
const usersRouter = (0, express_1.Router)();
const namePattern = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
usersRouter.use(auth_1.default, (0, authorize_1.default)('admin'));
usersRouter.get('/', async (req, res, next) => {
    try {
        const currentUserId = req.user?._id;
        const users = await User_1.default.find({
            _id: { $ne: currentUserId },
        })
            .select('name email role createdAt')
            .sort({ createdAt: -1 });
        return res.status(200).json({ users });
    }
    catch (error) {
        return next(error);
    }
});
usersRouter.put('/:id', (0, validate_1.default)([(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid user id')]), async (req, res, next) => {
    try {
        const { name, email, role } = req.body;
        if (!name || !email || !role) {
            return res.status(400).json({ message: 'name, email, and role are required' });
        }
        if (!['admin', 'adjuster'].includes(role)) {
            return res.status(400).json({ message: 'role must be admin or adjuster' });
        }
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (!namePattern.test(trimmedName)) {
            return res.status(400).json({ message: 'name may only contain letters and spaces' });
        }
        if (!emailPattern.test(trimmedEmail)) {
            return res.status(400).json({ message: 'email must be a valid email address' });
        }
        if (req.user && String(req.user._id) === req.params.id) {
            return res.status(400).json({ message: 'Admins cannot edit their own account from this endpoint' });
        }
        const existingWithEmail = await User_1.default.findOne({ email: trimmedEmail }).select('_id');
        if (existingWithEmail && String(existingWithEmail._id) !== req.params.id) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.name = trimmedName;
        user.email = trimmedEmail;
        user.role = role;
        await user.save();
        return res.status(200).json({ user: user.toJSON() });
    }
    catch (error) {
        return next(error);
    }
});
usersRouter.delete('/:id', (0, validate_1.default)([(0, express_validator_1.param)('id').isMongoId().withMessage('Invalid user id')]), async (req, res, next) => {
    try {
        if (req.user && String(req.user._id) === req.params.id) {
            return res.status(400).json({ message: 'Admins cannot delete their own account from this endpoint' });
        }
        const deletedUser = await User_1.default.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = usersRouter;
