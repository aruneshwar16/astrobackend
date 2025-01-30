import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import appointmentRoutes from './routes/appointments.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://aruneshwar:aruneshwar16@cluster0.q953g.mongodb.net/astrology?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});

// JWT Secret
const JWT_SECRET = 'astrology_jwt_secret_key_2025';

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    console.log('📝 Signup Request Body:', { ...req.body, password: '[HIDDEN]' });
    
    const { username, email, password, zodiacSign } = req.body;

    // Validate required fields
    if (!username || !email || !password || !zodiacSign) {
      console.log('❌ Missing required fields:', {
        username: !username,
        email: !email,
        password: !password,
        zodiacSign: !zodiacSign
      });
      return res.status(400).json({
        message: 'All fields are required',
        missing: { username: !username, email: !email, password: !password, zodiacSign: !zodiacSign }
      });
    }

    // Check if user already exists
    console.log('🔍 Checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('❌ User already exists:', {
        existingUsername: existingUser.username === username,
        existingEmail: existingUser.email === email
      });
      return res.status(400).json({
        message: existingUser.username === username ? 'Username already exists' : 'Email already exists'
      });
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    console.log('👤 Creating new user...');
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      zodiacSign
    });

    // Save user to database
    console.log('💾 Saving user to database...');
    await newUser.save();

    console.log('✅ User created successfully:', {
      username: newUser.username,
      email: newUser.email,
      zodiacSign: newUser.zodiacSign
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        username: newUser.username,
        email: newUser.email,
        zodiacSign: newUser.zodiacSign
      }
    });

  } catch (error) {
    console.error('❌ Signup Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('📝 Login Request Body:', { ...req.body, password: '[HIDDEN]' });
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful:', username);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        email: user.email,
        zodiacSign: user.zodiacSign
      }
    });

  } catch (error) {
    console.error('❌ Login Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Appointment routes
app.use('/api/appointments', appointmentRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`
🚀 Server is running!
📍 URL: http://localhost:${PORT}
🌐 Frontend: http://localhost:5173
🔒 Mode: ${process.env.NODE_ENV || 'development'}
  `);
});
