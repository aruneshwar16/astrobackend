import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import appointmentRoutes from './routes/appointments.js';
import dotenv from 'dotenv'; // dotenv for .env file

dotenv.config(); // load .env variables

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  'https://astro-dailyhub.netlify.app',
  'https://679b24ee5484b82d5d1eb09f--astro-dailyhub.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('❌ Blocked by CORS:', origin);
      return callback(null, false);
    }
    console.log('✅ Allowed by CORS:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// MongoDB Connection
const connectDB = async (retryCount = 0) => {
  try {
    console.log('📡 Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error(`❌ MongoDB Connection Error (Attempt ${retryCount + 1}):`, err.message);
    
    if (retryCount < 3) {
      console.log(`🔄 Retrying connection in 5 seconds... (Attempt ${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retryCount + 1);
    } else {
      console.error('❌ Failed to connect to MongoDB after 3 attempts');
      console.log('Please check:');
      console.log('1. MongoDB Atlas connection string is correct');
      console.log('2. Network connection is stable');
      console.log('3. MongoDB Atlas service status');
      process.exit(1);
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected');
});

// Start server after MongoDB connection
const startServer = async () => {
  try {
    const port = process.env.PORT || 8000;
    
    // Try to start the server
    app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please:
1. Stop any other instance of the server
2. Use a different port by setting the PORT environment variable
3. Or wait a few seconds and try again`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Initial connection
connectDB().then(() => {
  startServer();
}).catch(err => {
  console.error('❌ Failed to initialize:', err);
  process.exit(1);
});

// Handle application shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'astrology_jwt_secret_key_2025';

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
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('❌ User already exists:', { email, username });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      zodiacSign
    });

    await user.save();
    console.log('✅ User created successfully:', { username, email });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        zodiacSign: user.zodiacSign
      }
    });
  } catch (error) {
    console.error('❌ Signup Error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('📝 Login Request Body:', { ...req.body, password: '[HIDDEN]' });
    
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      console.log('❌ Missing required fields:', { username: !username, password: !password });
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found:', { username });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', { username });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ User logged in successfully:', { username });
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
    console.error('❌ Login Error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
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
