import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get current user profile (protected)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

// Update user profile (protected)
router.put('/me', auth, async (req, res) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, select: '-password' });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

export default router;
