import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { HydratedDocument } from 'mongoose';
import UserModel, { User, UserMethods } from '../models/User';

type AuthUserDocument = HydratedDocument<User, UserMethods>;

export interface AuthenticatedRequest extends Request {
  user?: AuthUserDocument;
}

const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-secret') as JwtPayload | string;

    if (typeof decoded === 'string') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userId = decoded.id || decoded.userId || decoded.sub;

    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await UserModel.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
