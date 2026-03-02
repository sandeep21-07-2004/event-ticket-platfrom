import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Add ticket types to a draft event (Organizer)
router.post('/', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const { event_id, name, price, quantity } = req.body;

        // Check if event belongs to organizer
        const [[event]] = await pool.query('SELECT * FROM events WHERE id = ?', [event_id]);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.created_by !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (event.status !== 'draft') {
            return res.status(400).json({ message: 'Can only add ticket types to draft events' });
        }

        await pool.query(
            'INSERT INTO ticket_types (event_id, name, price, quantity) VALUES (?, ?, ?, ?)',
            [event_id, name, price, quantity]
        );

        res.status(201).json({ message: 'Ticket type added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get ticket types for an event
router.get('/types/:eventId', async (req, res) => {
    try {
        const [types] = await pool.query('SELECT * FROM ticket_types WHERE event_id = ?', [req.params.eventId]);
        res.json(types);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get purchased tickets by logged-in user
router.get('/my-tickets', requireAuth, async (req, res) => {
    try {
        const [tickets] = await pool.query(`
      SELECT t.*, tt.name as type_name, e.title as event_title, e.event_date, e.event_time, e.venue 
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN orders o ON t.order_id = o.id
      JOIN events e ON o.event_id = e.id
      WHERE o.user_id = ?
    `, [req.user.userId]);

        res.json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
