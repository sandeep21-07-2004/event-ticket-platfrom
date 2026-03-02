import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Event check-in scan logic
router.post('/scan', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const { code, event_id } = req.body;

        const [[ticket]] = await pool.query(
            `SELECT t.*, o.event_id, e.created_by 
       FROM tickets t 
       JOIN orders o ON t.order_id = o.id 
       JOIN events e ON o.event_id = e.id
       WHERE t.ticket_code = ? AND o.event_id = ?`,
            [code, event_id]
        );

        if (!ticket) {
            return res.status(404).json({ message: 'Invalid ticket or ticket does not belong to this event' });
        }

        if (ticket.created_by !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (ticket.checkin_status === 'checked') {
            return res.status(400).json({ message: 'Already checked in' });
        }

        await pool.query(
            "UPDATE tickets SET checkin_status = 'checked' WHERE id = ?",
            [ticket.id]
        );

        res.json({ success: true, message: 'Ticket checked in successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
