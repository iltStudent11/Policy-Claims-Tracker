import { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';

interface DuplicateKeyError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof mongoose.Error.ValidationError) {
    const fieldErrors = Object.entries(error.errors).reduce<Record<string, string>>((acc, [field, details]) => {
      acc[field] = details.message;
      return acc;
    }, {});

    return res.status(400).json({
      message: 'Validation failed',
      errors: fieldErrors,
    });
  }

  const duplicateKeyError = error as DuplicateKeyError;
  if (duplicateKeyError.code === 11000) {
    const duplicateField = Object.keys(duplicateKeyError.keyValue || {})[0] || 'field';
    return res.status(409).json({
      message: `${duplicateField} already exists`,
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      message: 'Invalid identifier format',
    });
  }

  console.error(error);
  return res.status(500).json({
    message: 'Internal server error',
  });
};

export default errorHandler;
