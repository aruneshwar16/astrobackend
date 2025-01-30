import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    zodiacSign: {
      type: String,
      required: [true, 'Zodiac sign is required'],
      enum: {
        values: [
          'Aries', 'Taurus', 'Gemini', 'Cancer',
          'Leo', 'Virgo', 'Libra', 'Scorpio',
          'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
        ],
        message: '{VALUE} is not a valid zodiac sign',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'users',
    timestamps: true,
  }
);

// Create indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

// Create the model
const User = mongoose.model('User', userSchema);

// Export the model
export default User;
