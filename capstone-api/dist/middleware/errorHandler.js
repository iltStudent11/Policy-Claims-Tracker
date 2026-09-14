"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler = (error, _req, res, _next) => {
    if (error instanceof mongoose_1.default.Error.ValidationError) {
        const fieldErrors = Object.entries(error.errors).reduce((acc, [field, details]) => {
            acc[field] = details.message;
            return acc;
        }, {});
        return res.status(400).json({
            message: 'Validation failed',
            errors: fieldErrors,
        });
    }
    const duplicateKeyError = error;
    if (duplicateKeyError.code === 11000) {
        const duplicateField = Object.keys(duplicateKeyError.keyValue || {})[0] || 'field';
        return res.status(409).json({
            message: `${duplicateField} already exists`,
        });
    }
    if (error instanceof mongoose_1.default.Error.CastError) {
        return res.status(400).json({
            message: 'Invalid identifier format',
        });
    }
    console.error(error);
    return res.status(500).json({
        message: 'Internal server error',
    });
};
exports.default = errorHandler;
