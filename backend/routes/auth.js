import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  // Validate request body
  const { email, firstname, lastname, username, password, refCode } = req.body;
  if (!email || !firstname || !lastname || !username || !password) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }
  // Check for existing user
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(409).json({ error: 'Email or username already exists.' });
  }
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  // Create user
  const user = new User({
    email,
    firstname,
    lastname,
    username,
    password: hashedPassword,
    refCode,
  });
  await user.save();
  res.status(201).json({ message: 'User created successfully.' });
});

// Login route
router.post('/login', async (req, res) => {
  // Validate request body
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  // Check password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  // Create JWT token
  const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '7d' });
  res.json({ token, user: { email: user.email, username: user.username, firstname: user.firstname, lastname: user.lastname } });
});

export default router;
