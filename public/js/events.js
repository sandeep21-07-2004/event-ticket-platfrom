let currentEventId = null;
let currentTicketTypes = [];
let selectedTickets = {}; // { ticket_type_id: qty }

document.addEventListener("DOMContentLoaded", async () => {
    await loadEvents();
});

async function loadEvents() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const events = await res.json();

        document.getElementById('events-loader').style.display = 'none';
        const grid = document.getElementById('events-grid');
        grid.style.display = 'grid';

        if (events.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No published events available right now.</p>';
            return;
        }

        grid.innerHTML = events.map(event => `
            <div class="glass-card">
                <h3 style="margin-bottom: 10px; color: var(--neon-accent);">${event.title}</h3>
                <p style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 15px;">
                    📅 ${new Date(event.event_date).toLocaleDateString()} | ⏰ ${event.event_time}<br>
                    📍 ${event.venue}
                </p>
                <p style="margin-bottom: 20px; font-size: 0.95em;">${event.description}</p>
                <button class="btn-neon" style="width: 100%;" onclick="openBuyModal(${event.id}, '${event.title.replace(/'/g, "\\'")}')">Get Tickets</button>
            </div>
        `).join('');

    } catch (error) {
        showToast("Error loading events");
        console.error(error);
    }
}

async function openBuyModal(eventId, title) {
    if (!getUser()) {
        showToast("Please login first to buy tickets.");
        setTimeout(() => window.location.href = 'register.html', 1500);
        return;
    }

    currentEventId = eventId;
    selectedTickets = {};
    document.getElementById('modal-event-title').textContent = title;

    // Fetch Ticket Types
    try {
        const res = await fetch(`${API_BASE}/tickets/types/${eventId}`);
        currentTicketTypes = await res.json();

        const container = document.getElementById('ticket-types-container');
        if (currentTicketTypes.length === 0) {
            container.innerHTML = '<p>No tickets added yet.</p>';
        } else {
            container.innerHTML = currentTicketTypes.map(tt => {
                const available = tt.quantity - tt.sold;
                const isSoldOut = available <= 0;
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 15px 0; border-bottom: 1px solid var(--glass-border);">
                    <div>
                        <h4 style="margin-bottom:5px;">${tt.name} ${isSoldOut ? '<span class="badge badge-soldout">Sold Out</span>' : ''}</h4>
                        <p style="color:var(--text-muted); font-size:0.9em;">$${tt.price} - ${available} available</p>
                    </div>
                    <div>
                        <input type="number" min="0" max="${available}" value="0" ${isSoldOut ? 'disabled' : ''}
                               onchange="updateSelection(${tt.id}, this.value, ${tt.price})"
                               style="width: 60px; text-align:center;">
                    </div>
                </div>`;
            }).join('');
        }

        updateTotal();
        document.getElementById('buy-modal').style.display = 'block';
        document.getElementById('modal-backdrop').style.display = 'block';
    } catch (err) {
        showToast("Failed to load ticket types");
    }
}

function updateSelection(ttId, qty, price) {
    qty = parseInt(qty) || 0;
    if (qty > 0) {
        selectedTickets[ttId] = { qty, price };
    } else {
        delete selectedTickets[ttId];
    }
    updateTotal();
}

function updateTotal() {
    let total = 0;
    for (let id in selectedTickets) {
        total += selectedTickets[id].qty * selectedTickets[id].price;
    }
    document.getElementById('total-price').textContent = `Total: $${total.toFixed(2)}`;
}

function closeModal() {
    document.getElementById('buy-modal').style.display = 'none';
    document.getElementById('modal-backdrop').style.display = 'none';
}

async function processOrder() {
    const orderItems = Object.keys(selectedTickets).map(id => ({
        ticket_type_id: parseInt(id),
        quantity: selectedTickets[id].qty
    }));

    if (orderItems.length === 0) {
        return showToast("Please select at least one ticket");
    }

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                event_id: currentEventId,
                tickets: orderItems
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast("Order Successful! Generating your tickets...");
        closeModal();
        setTimeout(() => window.location.href = 'dashboard.html', 1500);

    } catch (err) {
        showToast(err.message || 'Payment simulation failed');
    }
}
