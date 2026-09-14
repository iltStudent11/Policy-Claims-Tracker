const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.get('/adjusters', auth, async (req, res, next) => {
  try {
    const adjusters = await User.find({ role: 'adjuster' }).select('name email role').sort({ name: 1 });
    return res.json({ adjusters });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
