
// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let allOrders = [];

// DOM Elements
const tableBody = document.getElementById('orders-table-body');
const totalOrdersEl = document.getElementById('total-orders');
const totalRevenueEl = document.getElementById('total-revenue');
const pendingOrdersEl = document.getElementById('pending-orders');
const searchInput = document.getElementById('search-input');

// --- Main Logic ---

async function fetchOrders() {
    try {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allOrders = data;
        renderOrders(allOrders);
        updateStats(allOrders);

    } catch (err) {
        console.error('Fetch Error:', err);
        showToast('Error fetching orders', 'error');
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400">Failed to load orders.</td></tr>`;
    } finally {
        setLoading(false);
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">No orders found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString() + ' ' + new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        // Status Badge Logic
        let statusColor = 'bg-gray-500/20 text-gray-300';
        if (order.status === 'pending') statusColor = 'bg-yellow-500/20 text-yellow-500';
        if (order.status === 'shipped') statusColor = 'bg-blue-500/20 text-blue-400';
        if (order.status === 'delivered') statusColor = 'bg-[#00dc82]/20 text-[#00dc82]';
        if (order.status === 'cancelled') statusColor = 'bg-red-500/20 text-red-400';

        return `
            <tr class="hover:bg-white/5 transition-colors group">
                <td class="p-4">
                    <span class="font-mono text-xs text-gray-500">#${order.id}</span>
                    <div class="text-xs text-gray-400 mt-1">${date}</div>
                </td>
                <td class="p-4">
                    <div class="font-bold">${order.customer_name}</div>
                    <div class="text-xs text-gray-400">${order.phone}</div>
                    <div class="text-xs text-gray-500 truncate max-w-[150px]" title="${order.address}">${order.address}</div>
                    ${order.note ? `<div class="text-[10px] text-yellow-500 mt-1 bg-yellow-500/10 inline-block px-1 rounded">Note: ${order.note}</div>` : ''}
                </td>
                <td class="p-4">
                    <div class="text-sm text-gray-300 max-w-[200px] truncate" title="${itemsList}">
                        ${itemsList}
                    </div>
                </td>
                <td class="p-4 font-bold text-[#00dc82]">
                    $${order.total_amount}
                </td>
                <td class="p-4">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" 
                            class="${statusColor} px-2 py-1 rounded-lg text-xs font-bold border-none focus:ring-1 focus:ring-white/20 cursor-pointer appearance-none text-center block w-full transition-colors">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td class="p-4 text-right">
                    <button onclick="confirmDelete(${order.id})" class="text-gray-600 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-white/5" title="Delete Order">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStats(orders) {
    totalOrdersEl.textContent = orders.length;

    // Calculate Revenue (exclude cancelled)
    const revenue = orders.filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    totalRevenueEl.textContent = `$${revenue.toFixed(2)}`;

    const pending = orders.filter(o => o.status === 'pending').length;
    pendingOrdersEl.textContent = pending;
}

// --- Actions ---

async function updateOrderStatus(id, newStatus) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        // Update local state without fetching
        const orderIndex = allOrders.findIndex(o => o.id === id);
        if (orderIndex > -1) {
            allOrders[orderIndex].status = newStatus;
            updateStats(allOrders); // To update pending count
            // Re-render specifically this row logic is complex, simpler to re-render all for now or just change class
            // For simplicity in this demo, we'll re-fetch or re-render
            renderOrders(allOrders);
        }

        showToast(`Order status updated to ${newStatus}`);

    } catch (err) {
        console.error('Update Error:', err);
        showToast('Failed to update status', 'error');
        fetchOrders(); // Revert UI
    }
}

async function confirmDelete(id) {
    if (confirm("Are you sure you want to permanently delete this order?")) {
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            allOrders = allOrders.filter(o => o.id !== id);
            renderOrders(allOrders);
            updateStats(allOrders);
            showToast('Order newly deleted');

        } catch (err) {
            console.error('Delete Error:', err);
            showToast('Failed to delete order', 'error');
        }
    }
}

// --- Search ---

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allOrders.filter(o =>
        o.customer_name.toLowerCase().includes(term) ||
        o.phone.includes(term) ||
        o.id.toString().includes(term)
    );
    renderOrders(filtered);
});

// --- Helpers ---

function setLoading(isLoading) {
    if (isLoading && tableBody.children.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500"><div class="loader ease-linear rounded-full border-2 border-t-2 border-gray-500 h-6 w-6 mx-auto"></div></td></tr>`;
    }
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    const colorClass = type === 'error' ? 'border-red-500 text-red-400' : 'border-[#00dc82] text-white';

    toast.className = `fixed bottom-5 right-5 glass px-6 py-3 rounded-xl border-l-4 ${colorClass} z-50 animate-bounce flex items-center gap-3 shadow-2xl`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-check-circle'}"></i> <span>${msg}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Start
document.addEventListener('DOMContentLoaded', fetchOrders);
