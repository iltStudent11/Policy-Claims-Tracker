const express = require('express');
const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

const canModifyClaim = (user, claim) => {
  if (user.role === 'admin') return true;
  if (!claim.assignedAdjuster) return false;
  return String(claim.assignedAdjuster) === String(user._id);
};

router.post('/', auth, async (req, res, next) => {
  try {
    const { policy, description, incidentDate, claimedAmount, assignedAdjuster } = req.body;

    if (!policy || !description || !incidentDate || claimedAmount === undefined) {
      return res
        .status(400)
        .json({ message: 'policy, description, incidentDate, and claimedAmount are required.' });
    }

    const linkedPolicy = await Policy.findById(policy);
    if (!linkedPolicy) {
      return res.status(404).json({ message: 'Policy not found.' });
    }

    if (assignedAdjuster) {
      const adjuster = await User.findOne({ _id: assignedAdjuster, role: 'adjuster' });
      if (!adjuster) {
        return res.status(400).json({ message: 'assignedAdjuster must reference an adjuster user.' });
      }
    }

    const claim = await Claim.create(req.body);
    const populated = await claim.populate([
      { path: 'policy', select: 'policyNumber holderName type status' },
      { path: 'assignedAdjuster', select: 'name email role' },
      { path: 'notes.author', select: 'name email role' },
    ]);

    return res.status(201).json({ claim: populated });
  } catch (error) {
    return next(error);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const { status, policy, assignedAdjuster, claimNumber } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (policy) filters.policy = policy;
    if (assignedAdjuster) filters.assignedAdjuster = assignedAdjuster;
    if (claimNumber) filters.claimNumber = claimNumber;

    const claims = await Claim.find(filters)
      .populate('policy', 'policyNumber holderName type status')
      .populate('assignedAdjuster', 'name email role')
      .populate('notes.author', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ claims });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('policy', 'policyNumber holderName type status')
      .populate('assignedAdjuster', 'name email role')
      .populate('notes.author', 'name email role');

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    return res.json({ claim });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    if (!canModifyClaim(req.user, claim)) {
      return res.status(403).json({ message: 'You are not allowed to modify this claim.' });
    }

    const forbiddenFields = ['claimNumber', 'notes'];
    forbiddenFields.forEach((field) => delete req.body[field]);

    if (req.body.assignedAdjuster) {
      const adjuster = await User.findOne({ _id: req.body.assignedAdjuster, role: 'adjuster' });
      if (!adjuster) {
        return res.status(400).json({ message: 'assignedAdjuster must reference an adjuster user.' });
      }
    }

    Object.assign(claim, req.body);
    await claim.save();

    const populated = await claim.populate([
      { path: 'policy', select: 'policyNumber holderName type status' },
      { path: 'assignedAdjuster', select: 'name email role' },
      { path: 'notes.author', select: 'name email role' },
    ]);

    return res.json({ claim: populated });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/notes', auth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Note text is required.' });
    }

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    claim.notes.push({
      author: req.user._id,
      text,
      timestamp: new Date(),
    });

    await claim.save();

    const populated = await claim.populate([
      { path: 'policy', select: 'policyNumber holderName type status' },
      { path: 'assignedAdjuster', select: 'name email role' },
      { path: 'notes.author', select: 'name email role' },
    ]);

    return res.status(201).json({ claim: populated });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const claim = await Claim.findByIdAndDelete(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    return res.json({ message: 'Claim deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
