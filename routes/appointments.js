import express from 'express';
import Appointment from '../models/Appointment.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create a new appointment
router.post('/', auth, async (req, res) => {
  try {
    console.log(' Creating new appointment:', { ...req.body, userId: req.user.userId });
    
    // Validate required fields
    const { name, email, phone, date, time, astrologer, consultationType } = req.body;
    if (!name || !email || !phone || !date || !time || !astrologer || !consultationType) {
      console.log(' Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(' Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      console.log(' Invalid phone number:', phone);
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Validate date (must be future date)
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      console.log(' Invalid date - must be future date');
      return res.status(400).json({ message: 'Please select a future date' });
    }

    const appointment = new Appointment({
      ...req.body,
      userId: req.user.userId,
      status: 'pending'
    });

    await appointment.save();
    
    console.log(' Appointment created successfully:', {
      id: appointment._id,
      name: appointment.name,
      date: appointment.date
    });

    res.status(201).json({
      message: 'Appointment booked successfully Thank you!',
      appointment
    });
  } catch (error) {
    console.error(' Error creating appointment:', error);
    res.status(500).json({
      message: 'Error booking appointment',
      error: error.message
    });
  }
});

// Get user's appointments
router.get('/my-appointments', auth, async (req, res) => {
  try {
    console.log(' Fetching appointments for user:', req.user.userId);
    
    const appointments = await Appointment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    
    console.log(' Successfully fetched appointments:', {
      count: appointments.length
    });

    res.json(appointments);
  } catch (error) {
    console.error(' Error fetching appointments:', error);
    res.status(500).json({
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

// Update appointment status
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error(' Error updating appointment:', error);
    res.status(500).json({
      message: 'Error updating appointment',
      error: error.message
    });
  }
});

// Cancel appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error(' Error cancelling appointment:', error);
    res.status(500).json({
      message: 'Error cancelling appointment',
      error: error.message
    });
  }
});

export default router;
