const express = require('express');
const Policy = require('../models/Policy');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      owner: req.body.owner || req.user._id,
    };

    const policy = await Policy.create(payload);
    const populated = await policy.populate('owner', 'name email role');

    return res.status(201).json({ policy: populated });
  } catch (error) {
    return next(error);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const { status, type, owner } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (owner) filters.owner = owner;

    const policies = await Policy.find(filters)
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ policies });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id).populate('owner', 'name email role');

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found.' });
    }

    return res.json({ policy });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const policy = await Policy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('owner', 'name email role');

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found.' });
    }

    return res.json({ policy });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: 'Policy not found.' });
    }

    return res.json({ message: 'Policy deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
