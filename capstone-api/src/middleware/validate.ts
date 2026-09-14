import { NextFunction, Request, Response } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

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

export default validate;
