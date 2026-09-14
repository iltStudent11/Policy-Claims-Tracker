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
const signAuthToken = (userId) => {
    return jsonwebtoken_1.default.sign({ id: userId }, process.env.JWT_SECRET || 'development-secret', {
        expiresIn: '1d',
    });
};
authRouter.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email, and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'password must be at least 8 characters' });
        }
        const existing = await User_1.default.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' });
        }
        const user = await User_1.default.create({
            name,
            email,
            password,
            role,
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
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
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
exports.default = authRouter;
