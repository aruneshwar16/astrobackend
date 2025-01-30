import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', {
      ...req.body,
      password: '[HIDDEN]'
    });

    const { username, email, password, zodiacSign } = req.body;

    // Validate required fields
    if (!username || !email || !password || !zodiacSign) {
      const missingFields = {
        username: !username,
        email: !email,
        password: !password,
        zodiacSign: !zodiacSign
      };
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({
        message: 'All fields are required',
        missingFields
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters long'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    // Check if user exists
    console.log('Checking for existing user...');
    let existingUser;
    try {
      existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }]
      }).exec();
    } catch (dbError) {
      console.error('Database error while checking existing user:', dbError);
      return res.status(500).json({
        message: 'Error checking existing user',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (existingUser) {
      const isDuplicateEmail = existingUser.email === email.toLowerCase();
      console.log('User already exists:', {
        isDuplicateEmail,
        email: isDuplicateEmail ? email : undefined,
        username: !isDuplicateEmail ? username : undefined
      });
      return res.status(400).json({
        message: isDuplicateEmail 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Hash password
    console.log('Hashing password...');
    let hashedPassword;
    try {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    } catch (hashError) {
      console.error('Error hashing password:', hashError);
      return res.status(500).json({
        message: 'Error processing password',
        error: process.env.NODE_ENV === 'development' ? hashError.message : undefined
      });
    }

    // Create new user
    console.log('Creating new user...');
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      zodiacSign
    });

    // Save user
    let savedUser;
    try {
      console.log('Saving user to database...');
      savedUser = await user.save();
      console.log('User saved successfully:', {
        id: savedUser._id,
        username: savedUser.username
      });
    } catch (saveError) {
      console.error('Error saving user:', saveError);
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Validation error',
          errors: Object.values(saveError.errors).map(err => err.message)
        });
      }
      if (saveError.code === 11000) {
        return res.status(400).json({
          message: 'Username or email already exists'
        });
      }
      return res.status(500).json({
        message: 'Database operation failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? saveError.message : undefined
      });
    }

    // Create token
    let token;
    try {
      token = jwt.sign(
        { userId: savedUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    } catch (tokenError) {
      console.error('Error creating token:', tokenError);
      // User is saved but token creation failed
      return res.status(500).json({
        message: 'User registered but error creating token. Please try logging in.',
        error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
      });
    }

    // Send success response
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        zodiacSign: savedUser.zodiacSign
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required'
      });
    }

    // Find user by username or email
    let user;
    try {
      user = await User.findOne({
        $or: [
          { username },
          { email: username }
        ]
      }).exec();
    } catch (dbError) {
      console.error('Database error while checking existing user:', dbError);
      return res.status(500).json({
        message: 'Error checking existing user',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Verify password
    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (compareError) {
      console.error('Error comparing password:', compareError);
      return res.status(500).json({
        message: 'Error processing password',
        error: process.env.NODE_ENV === 'development' ? compareError.message : undefined
      });
    }

    if (!isMatch) {
      console.log('Login failed: Invalid password');
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Create token
    let token;
    try {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    } catch (tokenError) {
      console.error('Error creating token:', tokenError);
      return res.status(500).json({
        message: 'Error creating token',
        error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
      });
    }

    console.log('Login successful for user:', user.username);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        zodiacSign: user.zodiacSign
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
