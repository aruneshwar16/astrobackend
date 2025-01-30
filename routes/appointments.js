import express from 'express';
import Appointment from '../models/Appointment.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create a new appointment
router.post('/', auth, async (req, res) => {
  try {
    console.log(' Creating new appointment:', { ...req.body, userId: req.user.userId });
    
    const appointment = new Appointment({
      ...req.body,
      userId: req.user.userId,
      status: 'pending'
    });

    await appointment.save();
    
    console.log(' Appointment created successfully');
    res.status(201).json({
      message: 'Appointment booked successfully Thank you!',
      appointment
    });
  } catch (error) {
    console.error(' Error creating appointment:', error);
    res.status(500).json({
      message: 'Error booking appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's appointments
router.get('/my-appointments', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json(appointments);
  } catch (error) {
    console.error(' Error fetching appointments:', error);
    res.status(500).json({
      message: 'Error fetching appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
