let currentUser = null;
let currentManageEventId = null;

document.addEventListener("DOMContentLoaded", async () => {
    currentUser = getUser();
    if (!currentUser) {
        window.location.href = 'register.html';
        return;
    }

    document.getElementById('role-badge').textContent = currentUser.role.toUpperCase();

    if (currentUser.role === 'admin' || currentUser.role === 'organizer') {
        document.getElementById('organizer-view').style.display = 'block';
        await loadOrgEvents();
    } else {
        document.getElementById('attendee-view').style.display = 'block';
        await loadMyTickets();
        await loadMyOrders();
    }
});

function showOrgTab(tabId) {
    document.querySelectorAll('.dashboard-section').forEach(el => el.style.display = 'none');
    document.getElementById(`org-${tabId}`).style.display = 'block';
}

function openCreateEventModal() { document.getElementById('createEventModal').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- Attendee Logic ---
async function loadMyTickets() {
    try {
        const tickets = await apiRequest('/tickets/my-tickets');
        const container = document.getElementById('my-tickets-container');
        if (tickets.length === 0) {
            container.innerHTML = '<p>You have not purchased any tickets yet.</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr><th>Ticket Code</th><th>Event</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                    ${tickets.map(t => `
                        <tr>
                            <td style="font-family:monospace; color:var(--neon-accent);">${t.ticket_code}</td>
                            <td>${t.event_title} (${new Date(t.event_date).toLocaleDateString()})</td>
                            <td>${t.type_name}</td>
                            <td><span class="badge ${t.checkin_status === 'checked' ? 'badge-soldout' : 'badge-free'}">${t.checkin_status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) { }
}

async function loadMyOrders() {
    try {
        const orders = await apiRequest('/orders/my-orders');
        const container = document.getElementById('my-orders-container');
        if (orders.length === 0) {
            container.innerHTML = '<p>No orders found.</p>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr><th>Order ID</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                    ${orders.map(o => `
                        <tr>
                            <td>#${o.id}</td>
                            <td>${new Date(o.order_date).toLocaleString()}</td>
                            <td>$${o.total_amount}</td>
                            <td>${o.payment_status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) { }
}

// --- Organizer Logic ---

document.getElementById('create-event-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await apiRequest('/events', {
            method: 'POST',
            body: {
                title: document.getElementById('ce-title').value,
                description: document.getElementById('ce-desc').value,
                venue: document.getElementById('ce-venue').value,
                event_date: document.getElementById('ce-date').value,
                event_time: document.getElementById('ce-time').value,
            }
        });
        showToast('Event created successfully');
        closeModal('createEventModal');
        await loadOrgEvents();
    } catch (err) { }
});

async function loadOrgEvents() {
    try {
        const events = await apiRequest('/events/my-events');

        // Populate events list
        const list = document.getElementById('org-events-list');
        if (events.length === 0) {
            list.innerHTML = '<p style="margin-top:20px;">You have not created any events.</p>';
        } else {
            list.innerHTML = `
                <table>
                    <thead><tr><th>Event Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${events.map(e => `
                            <tr>
                                <td>${e.title}</td>
                                <td>${new Date(e.event_date).toLocaleDateString()}</td>
                                <td>${e.status}</td>
                                <td><button class="btn-neon" style="padding:4px 8px; font-size:0.8rem;" onclick="openManageEventModal(${e.id}, '${e.status}')">Manage</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // Populate checkin select
        const checkinSelect = document.getElementById('checkin-event-select');
        checkinSelect.innerHTML = events
            .filter(e => e.status === 'published' || e.status === 'completed')
            .map(e => `<option value="${e.id}">${e.title}</option>`)
            .join('');

    } catch (err) { }
}

async function openManageEventModal(id, status) {
    currentManageEventId = id;
    document.getElementById('manageEventModal').style.display = 'flex';

    // reset UI
    document.getElementById('add-ticket-section').style.display = status === 'draft' ? 'block' : 'none';
    document.getElementById('publish-event-btn').style.display = status === 'draft' ? 'block' : 'none';
    document.getElementById('complete-event-btn').style.display = status === 'published' ? 'block' : 'none';
    document.getElementById('event-stats-section').innerHTML = 'Loading stats...';

    // load stats & ticket types
    try {
        const stats = await apiRequest(`/events/${id}/stats`);
        document.getElementById('event-stats-section').innerHTML = `
            <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:8px;">
                <p><strong>Total Revenue: </strong> $${stats.totalRevenue.toFixed(2)}</p>
                <p><strong>Tickets Sold: </strong> ${stats.totalTicketsSold}</p>
                <p><strong>Checked-in: </strong> ${stats.checkedIn}</p>
                <h5 style="margin-top:15px; margin-bottom:10px;">Ticket Types (${stats.ticketTypes.length})</h5>
                ${stats.ticketTypes.map(tt => `<div style="font-size:0.9em;">- ${tt.name}: $${tt.price} (Sold: ${tt.sold}/${tt.quantity})</div>`).join('')}
            </div>
        `;
    } catch (err) {
        document.getElementById('event-stats-section').innerHTML = '<p>Could not load statistics.</p>';
    }
}

async function addTicketType() {
    try {
        await apiRequest('/tickets', {
            method: 'POST',
            body: {
                event_id: currentManageEventId,
                name: document.getElementById('tt-name').value,
                price: parseFloat(document.getElementById('tt-price').value),
                quantity: parseInt(document.getElementById('tt-qty').value)
            }
        });
        showToast('Ticket type added');
        openManageEventModal(currentManageEventId, 'draft'); // refresh stats
    } catch (err) { }
}

async function publishEvent() {
    try {
        await apiRequest(`/events/${currentManageEventId}/publish`, { method: 'PUT' });
        showToast('Event is now published!');
        closeModal('manageEventModal');
        await loadOrgEvents();
    } catch (err) { }
}

async function completeEvent() {
    try {
        await apiRequest(`/events/${currentManageEventId}/complete`, { method: 'PUT' });
        showToast('Event marked as completed!');
        closeModal('manageEventModal');
        await loadOrgEvents();
    } catch (err) { }
}

async function processCheckin() {
    const eventId = document.getElementById('checkin-event-select').value;
    const code = document.getElementById('ticket-code-input').value.trim();
    const resultDiv = document.getElementById('checkin-result');

    if (!eventId || !code) return showToast("Enter a ticket code");

    try {
        const res = await fetch(`${API_BASE}/checkin/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ event_id: eventId, code })
        });
        const data = await res.json();

        if (!res.ok) {
            resultDiv.style.color = 'var(--danger)';
            resultDiv.textContent = `❌ ${data.message}`;
        } else {
            resultDiv.style.color = 'var(--success)';
            resultDiv.textContent = `✅ ${data.message}`;
            document.getElementById('ticket-code-input').value = '';
        }
    } catch (err) {
        resultDiv.style.color = 'var(--danger)';
        resultDiv.textContent = `❌ Connection Error`;
    }
}
