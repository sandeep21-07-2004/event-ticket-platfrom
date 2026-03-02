import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all published events (Public)
router.get('/', async (req, res) => {
    try {
        const [events] = await pool.query('SELECT * FROM events WHERE status = ?', ['published']);
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get events created by organizer
router.get('/my-events', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const [events] = await pool.query('SELECT * FROM events WHERE created_by = ?', [req.user.userId]);
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create draft event
router.post('/', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const { title, description, venue, event_date, event_time } = req.body;

        const [result] = await pool.query(
            'INSERT INTO events (title, description, venue, event_date, event_time, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, venue, event_date, event_time, req.user.userId, 'draft']
        );

        res.status(201).json({ message: 'Event created successfully', eventId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Publish event
router.put('/:id/publish', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const eventId = req.params.id;
        // Ensure the event belongs to this user or user is admin
        const [[event]] = await pool.query('SELECT created_by FROM events WHERE id = ?', [eventId]);

        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.created_by !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await pool.query('UPDATE events SET status = ? WHERE id = ?', ['published', eventId]);
        res.json({ message: 'Event published successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Complete event
router.put('/:id/complete', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const eventId = req.params.id;
        const [[event]] = await pool.query('SELECT created_by FROM events WHERE id = ?', [eventId]);

        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.created_by !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await pool.query('UPDATE events SET status = ? WHERE id = ?', ['completed', eventId]);
        res.json({ message: 'Event marked as completed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Event Analytics (Organizer)
router.get('/:id/stats', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const eventId = req.params.id;
        const [[event]] = await pool.query('SELECT created_by FROM events WHERE id = ?', [eventId]);

        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.created_by !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const [ticketTypes] = await pool.query('SELECT * FROM ticket_types WHERE event_id = ?', [eventId]);
        let totalRevenue = 0;
        let totalTicketsSold = 0;

        for (const tt of ticketTypes) {
            totalTicketsSold += tt.sold;
            totalRevenue += (tt.sold * parseFloat(tt.price));
        }

        // Checking stats
        const [[checkins]] = await pool.query(`
      SELECT COUNT(*) as checkedIn FROM tickets t 
      JOIN orders o ON t.order_id = o.id 
      WHERE o.event_id = ? AND t.checkin_status = 'checked'
    `, [eventId]);

        res.json({
            totalRevenue,
            totalTicketsSold,
            checkedIn: checkins.checkedIn || 0,
            ticketTypes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get specific event details
router.get('/:id', async (req, res) => {
    try {
        const [[event]] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Also fetch ticket types
        const [ticketTypes] = await pool.query('SELECT * FROM ticket_types WHERE event_id = ?', [req.params.id]);

        res.json({ ...event, ticket_types: ticketTypes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
