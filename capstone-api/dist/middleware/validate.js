"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array({ onlyFirstError: true }).map((error) => ({
                field: error.type === 'field' ? error.path : undefined,
                message: error.msg,
            })),
        });
    };
};
exports.default = validate;
