"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const authRouter = (0, express_1.Router)();
authRouter.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email, and password are required' });
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
        return res.status(201).json({ user: user.toJSON() });
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
        return res.status(200).json({ user: user.toJSON() });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = authRouter;
