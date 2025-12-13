
// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let allOrders = [];
let allProducts = [];

// DOM Elements
const ordersTableBody = document.getElementById('orders-table-body');
const productsTableBody = document.getElementById('products-table-body');
const totalOrdersEl = document.getElementById('total-orders');
const totalRevenueEl = document.getElementById('total-revenue');
const pendingOrdersEl = document.getElementById('pending-orders');
const searchInput = document.getElementById('search-input');

// --- Navigation & Auth ---

function logout() {
    window.location.href = 'login.html';
}

function switchTab(tab) {
    // Buttons
    document.getElementById('tab-orders').className = tab === 'orders' ?
        'px-4 py-2 rounded-lg text-sm font-bold bg-[#00dc82] text-[#003d33] transition-colors' :
        'px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors';

    document.getElementById('tab-products').className = tab === 'products' ?
        'px-4 py-2 rounded-lg text-sm font-bold bg-[#00dc82] text-[#003d33] transition-colors' :
        'px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors';

    // Sections
    if (tab === 'orders') {
        document.getElementById('section-orders').classList.remove('hidden');
        document.getElementById('section-products').classList.add('hidden');
    } else {
        document.getElementById('section-orders').classList.add('hidden');
        document.getElementById('section-products').classList.remove('hidden');
        fetchProducts();
    }
}

// --- Orders Logic ---

async function fetchOrders() {
    try {
        setLoading(ordersTableBody, true);
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
        setLoading(ordersTableBody, false, 'Failed to load orders.');
    } finally {
        // remove loader? handled by render
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        ordersTableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">No orders found.</td></tr>`;
        return;
    }

    ordersTableBody.innerHTML = orders.map(order => {
        const date = new Date(order.created_at).toLocaleDateString() + ' ' + new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

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
    const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    totalRevenueEl.textContent = `$${revenue.toFixed(2)}`;
    const pending = orders.filter(o => o.status === 'pending').length;
    pendingOrdersEl.textContent = pending;
}

async function updateOrderStatus(id, newStatus) {
    try {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        const orderIndex = allOrders.findIndex(o => o.id === id);
        if (orderIndex > -1) {
            allOrders[orderIndex].status = newStatus;
            updateStats(allOrders);
            renderOrders(allOrders);
        }
        showToast(`Order status updated to ${newStatus}`);
    } catch (err) {
        console.error('Update Error:', err);
        showToast('Failed to update status', 'error');
    }
}

async function confirmDelete(id) {
    if (confirm("Are you sure you want to permanently delete this order?")) {
        try {
            const { error } = await supabase.from('orders').delete().eq('id', id);
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

// --- Products Logic ---

async function fetchProducts() {
    try {
        setLoading(productsTableBody, true);
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allProducts = data;
        renderProducts(allProducts);
    } catch (err) {
        console.error('Fetch Products Error:', err);
        showToast('Error fetching products', 'error');
        setLoading(productsTableBody, false, 'Failed to load products');
    }
}

function renderProducts(products) {
    if (products.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">No products found.</td></tr>`;
        return;
    }

    productsTableBody.innerHTML = products.map(p => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="p-4"><img src="${p.image}" class="w-12 h-12 object-cover rounded-lg"></td>
            <td class="p-4 font-bold">${p.name}</td>
            <td class="p-4"><span class="bg-white/10 px-2 py-1 rounded text-xs">${p.category}</span></td>
            <td class="p-4 text-[#00dc82] font-bold">$${p.price}</td>
            <td class="p-4 text-xs text-gray-400">${p.unit}</td>
            <td class="p-4 text-right">
                <button onclick="editProduct(${p.id})" class="text-blue-400 hover:text-blue-300 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteProduct(${p.id})" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// --- Product Modal & CRUD ---

function openProductModal(isEdit = false, id = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('product-form');

    modal.classList.remove('hidden');

    if (isEdit && id) {
        const p = allProducts.find(item => item.id === id);
        title.textContent = "Edit Product";
        document.getElementById('p-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-unit').value = p.unit;
        document.getElementById('p-category').value = p.category;
        document.getElementById('p-image').value = p.image;
    } else {
        title.textContent = "Add New Product";
        form.reset();
        document.getElementById('p-id').value = '';
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function editProduct(id) {
    openProductModal(true, id);
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value;
    const price = parseFloat(document.getElementById('p-price').value);
    const unit = document.getElementById('p-unit').value;
    const category = document.getElementById('p-category').value;
    const image = document.getElementById('p-image').value;

    const newProduct = { name, price, unit, category, image };
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        if (id) {
            // Update
            const { error } = await supabase.from('products').update(newProduct).eq('id', id);
            if (error) throw error;
            showToast('Product updated!');
        } else {
            // Create
            const { error } = await supabase.from('products').insert([newProduct]);
            if (error) throw error;
            showToast('Product added!');
        }

        closeProductModal();
        fetchProducts(); // Refresh list

    } catch (err) {
        console.error('Save Product Error:', err);
        showToast('Failed to save product', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

async function deleteProduct(id) {
    if (confirm("Delete this product permanently?")) {
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            showToast('Product deleted');
            fetchProducts();
        } catch (err) {
            console.error('Delete Product Error:', err);
            showToast('Failed to delete product', 'error');
        }
    }
}


// --- Search ---

searchInput.addEventListener('input', (e) => {
    // Only searching orders for now as per previous logic, could expand to products if needed
    const term = e.target.value.toLowerCase();
    const filtered = allOrders.filter(o =>
        o.customer_name.toLowerCase().includes(term) ||
        o.phone.includes(term) ||
        o.id.toString().includes(term)
    );
    renderOrders(filtered);
});

// --- Helpers ---

function setLoading(container, isLoading, msg = 'No data') {
    if (isLoading) {
        container.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500"><div class="loader ease-linear rounded-full border-2 border-t-2 border-gray-500 h-6 w-6 mx-auto"></div></td></tr>`;
    } else {
        container.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">${msg}</td></tr>`;
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
