import { Router } from 'express';
import { param } from 'express-validator';
import authMiddleware, { AuthenticatedRequest } from '../middleware/auth';
import authorize from '../middleware/authorize';
import validate from '../middleware/validate';
import UserModel from '../models/User';

const usersRouter = Router();
const namePattern = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

usersRouter.use(authMiddleware, authorize('admin'));

usersRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const currentUserId = req.user?._id;

    const users = await UserModel.find({
      _id: { $ne: currentUserId },
    })
      .select('name email role createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
});

usersRouter.put(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid user id')]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { name, email, role } = req.body as {
        name?: string;
        email?: string;
        role?: 'admin' | 'adjuster';
      };

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

      const existingWithEmail = await UserModel.findOne({ email: trimmedEmail }).select('_id');

      if (existingWithEmail && String(existingWithEmail._id) !== req.params.id) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      const user = await UserModel.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.name = trimmedName;
      user.email = trimmedEmail;
      user.role = role;
      await user.save();

      return res.status(200).json({ user: user.toJSON() });
    } catch (error) {
      return next(error);
    }
  }
);

usersRouter.delete(
  '/:id',
  validate([param('id').isMongoId().withMessage('Invalid user id')]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (req.user && String(req.user._id) === req.params.id) {
        return res.status(400).json({ message: 'Admins cannot delete their own account from this endpoint' });
      }

      const deletedUser = await UserModel.findByIdAndDelete(req.params.id);

      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
);

export default usersRouter;
