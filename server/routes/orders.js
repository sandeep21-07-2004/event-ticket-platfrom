import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { generateTicketCode } from '../utils/ticketGenerator.js';

const router = express.Router();

// Create new order (Buy tickets)
router.post('/', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { event_id, tickets } = req.body; // tickets: [{ ticket_type_id, quantity }]

        // Check if event exists and is published
        const [[event]] = await connection.query('SELECT * FROM events WHERE id = ?', [event_id]);
        if (!event || event.status !== 'published') {
            await connection.rollback();
            return res.status(400).json({ message: 'Event not available' });
        }

        let totalAmount = 0;
        const ticketTypesData = [];

        // Check availability and calculate total
        for (const item of tickets) {
            const [[ticketType]] = await connection.query('SELECT * FROM ticket_types WHERE id = ? FOR UPDATE', [item.ticket_type_id]);

            if (!ticketType || ticketType.event_id !== parseInt(event_id)) {
                await connection.rollback();
                return res.status(400).json({ message: 'Invalid ticket type' });
            }

            const available = ticketType.quantity - ticketType.sold;
            if (item.quantity > available) {
                await connection.rollback();
                return res.status(400).json({ message: `Not enough tickets available for ${ticketType.name}` });
            }

            totalAmount += (parseFloat(ticketType.price) * item.quantity);
            ticketTypesData.push({ ...ticketType, reqQuantity: item.quantity });
        }

        // 1. Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, event_id, total_amount, payment_status) VALUES (?, ?, ?, ?)',
            [req.user.userId, event_id, totalAmount, 'pending']
        );
        const orderId = orderResult.insertId;

        // 2. Simulate Payment
        // For now, assume payment passes. If failed, we could update status to 'failed' here.
        await connection.query('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', orderId]);

        // 3. Generate tickets and update sold quantity
        for (const data of ticketTypesData) {
            // Update sold amount
            await connection.query('UPDATE ticket_types SET sold = sold + ? WHERE id = ?', [data.reqQuantity, data.id]);

            // Generate ticket entries
            for (let i = 0; i < data.reqQuantity; i++) {
                const ticketCode = generateTicketCode(req.user.userId, event_id);
                await connection.query(
                    'INSERT INTO tickets (order_id, ticket_type_id, ticket_code) VALUES (?, ?, ?)',
                    [orderId, data.id, ticketCode]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Order processed successfully', orderId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
});

// Get user orders
router.get('/my-orders', requireAuth, async (req, res) => {
    try {
        const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC', [req.user.userId]);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
