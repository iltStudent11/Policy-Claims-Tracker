import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../models/User';

const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
};

export default authorize;
