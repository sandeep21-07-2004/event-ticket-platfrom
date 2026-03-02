export function generateTicketCode(userId, eventId) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EVT${eventId}-USR${userId}-${random}`;
}
