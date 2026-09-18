"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = __importDefault(require("../middleware/auth"));
const authRouter = (0, express_1.Router)();
const namePattern = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const signAuthToken = (userId) => {
    return jsonwebtoken_1.default.sign({ id: userId }, process.env.JWT_SECRET || 'development-secret', {
        expiresIn: '1d',
    });
};
const getRequesterRoleFromHeader = async (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authorizationHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'development-secret');
        if (typeof decoded === 'string') {
            return null;
        }
        const userId = decoded.id || decoded.userId || decoded.sub;
        if (!userId || typeof userId !== 'string') {
            return null;
        }
        const requester = await User_1.default.findById(userId).select('role');
        return requester?.role ?? null;
    }
    catch {
        return null;
    }
};
authRouter.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email, and password are required' });
        }
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (!namePattern.test(trimmedName)) {
            return res
                .status(400)
                .json({ message: 'name may only contain letters and spaces' });
        }
        if (!emailPattern.test(trimmedEmail)) {
            return res.status(400).json({ message: 'email must be a valid email address' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'password must be at least 8 characters' });
        }
        const existing = await User_1.default.findOne({ email: trimmedEmail });
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const requestedRole = role || 'adjuster';
        const adminCount = await User_1.default.countDocuments({ role: 'admin' });
        const requesterRole = await getRequesterRoleFromHeader(req.headers.authorization);
        if (requestedRole === 'admin' && adminCount > 0 && requesterRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create additional admin users.' });
        }
        const user = await User_1.default.create({
            name: trimmedName,
            email: trimmedEmail,
            password,
            role: requestedRole,
        });
        const token = signAuthToken(user.id);
        return res.status(201).json({ token, user: user.toJSON() });
    }
    catch (error) {
        return next(error);
    }
});
authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailPattern.test(trimmedEmail)) {
            return res.status(400).json({ message: 'email must be a valid email address' });
        }
        const user = await User_1.default.findOne({ email: trimmedEmail }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = signAuthToken(user.id);
        return res.status(200).json({ token, user: user.toJSON() });
    }
    catch (error) {
        return next(error);
    }
});
authRouter.get('/me', auth_1.default, async (req, res) => {
    return res.status(200).json({ user: req.user?.toJSON() ?? null });
});
authRouter.put('/me', auth_1.default, async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'name and email are required' });
        }
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (!namePattern.test(trimmedName)) {
            return res.status(400).json({ message: 'name may only contain letters and spaces' });
        }
        if (!emailPattern.test(trimmedEmail)) {
            return res.status(400).json({ message: 'email must be a valid email address' });
        }
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ message: 'Missing authorization token' });
        }
        const existing = await User_1.default.findOne({ email: trimmedEmail });
        if (existing && String(existing._id) !== String(currentUser._id)) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        currentUser.name = trimmedName;
        currentUser.email = trimmedEmail;
        await currentUser.save();
        return res.status(200).json({ user: currentUser.toJSON() });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = authRouter;
