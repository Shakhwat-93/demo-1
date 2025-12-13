// --- Global State ---
let cart = JSON.parse(localStorage.getItem('freshHarvestCart')) || [];

// --- Product Data ---
// --- Product Data ---
let products = [];

// Fetch Products from Supabase
async function loadProducts() {
    if (typeof supabase === 'undefined') return;

    try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        products = data;

        // Re-render based on current page
        if (document.getElementById('home-products-grid')) renderProducts('home-products-grid', 'All', 4);
        if (document.getElementById('all-products-grid')) renderProducts('all-products-grid', 'All');

    } catch (err) {
        console.error('Failed to load products:', err);
        // Fallback or Toast?
    }
}


// --- 1. Cart System ---

function updateCartUI() {
    const countElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

    countElements.forEach(el => {
        el.textContent = totalItems;
        if (totalItems > 0) el.classList.add('badge-pulse');
        else el.classList.remove('badge-pulse');
    });

    if (window.location.pathname.includes('cart.html')) {
        renderCartPage();
    }

    localStorage.setItem('freshHarvestCart', JSON.stringify(cart));
}

function addToCart(id, qty = 1) {
    // Safety check for mixed types (string vs number id)
    const product = products.find(p => p.id == id);
    if (!product) return;

    const existingItem = cart.find(item => item.id == id);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({ ...product, quantity: qty });
    }

    // GTM Data Layer - Add to Cart
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
            currency: 'USD',
            value: product.price,
            items: [{
                item_id: product.id,
                item_name: product.name,
                item_category: product.category,
                price: product.price,
                quantity: qty
            }]
        }
    });

    updateCartUI();
    showToast(`${product.name} added to cart!`, 'cart');
}

function removeFromCart(id) {
    const itemToRemove = cart.find(item => item.id === id);
    if (itemToRemove) {
        // GTM Data Layer - Remove from Cart
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'remove_from_cart',
            ecommerce: {
                currency: 'USD',
                value: itemToRemove.price * itemToRemove.quantity,
                items: [{
                    item_id: itemToRemove.id,
                    item_name: itemToRemove.name,
                    price: itemToRemove.price,
                    quantity: itemToRemove.quantity
                }]
            }
        });
    }

    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) removeFromCart(id);
        else updateCartUI();
    }
}

function renderCartPage() {
    const cartContainer = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    if (!cartContainer) return;

    cartContainer.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="text-center py-10 col-span-3">
                <i class="fa-solid fa-basket-shopping text-6xl text-gray-600 mb-4"></i>
                <p class="text-gray-400">Your cart is empty.</p>
                <a href="products.html" class="text-accent hover:underline mt-2 inline-block">Start Shopping</a>
            </div>`;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        cartContainer.innerHTML += `
            <div class="flex items-center gap-4 bg-white/5 p-4 rounded-xl mb-4 border border-white/10 animate-fade-in-up">
                <img src="${item.image}" class="w-20 h-20 object-cover rounded-lg">
                <div class="flex-1">
                    <h3 class="font-bold">${item.name}</h3>
                    <p class="text-accent">$${item.price}</p>
                </div>
                <div class="flex items-center gap-3 bg-black/20 px-3 py-1 rounded-lg">
                    <button onclick="updateQuantity('${item.id}', -1)" class="hover:text-accent">-</button>
                    <span class="font-mono">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)" class="hover:text-accent">+</button>
                </div>
                <button onclick="removeFromCart('${item.id}')" class="text-red-400 hover:text-red-300 ml-4"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });

    if (subtotalEl) subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `$${(subtotal + 5).toFixed(2)}`;
}

// --- 2. Product Rendering & Filtering ---

function createProductCard(product) {
    const isWishlisted = localStorage.getItem(`wish_${product.id}`);
    const heartClass = isWishlisted ? 'fa-solid text-red-500' : 'fa-regular text-white';

    return `
        <div class="glass-card rounded-3xl overflow-hidden group hover-3d h-full flex flex-col cursor-pointer" onclick="openProductDetail('${product.id}')">
            <div class="relative h-56 overflow-hidden">
                <img src="${product.image}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="${product.name}">
                <div class="absolute top-3 right-3 flex gap-2">
                    <button onclick="event.stopPropagation(); toggleWishlist(this, '${product.id}')" class="bg-black/40 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/20 transition">
                        <i class="${heartClass}"></i>
                    </button>
                    <div class="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                        ${product.category}
                    </div>
                </div>
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="font-bold text-lg">${product.name}</h3>
                        <p class="text-xs text-gray-400">${product.unit}</p>
                    </div>
                    <span class="text-[#00dc82] font-bold text-xl">$${product.price}</span>
                </div>
                <button onclick="event.stopPropagation(); addToCart('${product.id}')" 
                        class="w-full mt-auto btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(0,220,130,0.3)] transition-all">
                    <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
}

function toggleWishlist(btn, id) {
    const icon = btn.querySelector('i');
    if (icon.classList.contains('fa-regular')) {
        icon.classList.remove('fa-regular', 'text-white');
        icon.classList.add('fa-solid', 'text-red-500');
        localStorage.setItem(`wish_${id}`, 'true');
        showToast('Added to Favorites');
    } else {
        icon.classList.remove('fa-solid', 'text-red-500');
        icon.classList.add('fa-regular', 'text-white');
        localStorage.removeItem(`wish_${id}`);
        showToast('Removed from Favorites');
    }
}

// --- Product Detail Modal ---

function openProductDetail(id) {
    const product = products.find(p => p.id == id); // Loose equality for potential string/int mismatch
    if (!product) return;

    // Create Modal HTML if not exists
    let modal = document.getElementById('product-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'product-detail-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 hidden opacity-0 transition-opacity duration-300';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="glass-card w-full max-w-4xl rounded-3xl overflow-hidden relative transform scale-95 transition-transform duration-300">
            <button onclick="closeProductDetail()" class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-[#00dc82] transition"><i class="fa-solid fa-xmark"></i></button>
            
            <div class="grid md:grid-cols-2">
                <div class="h-64 md:h-full relative group">
                     <img src="${product.image}" class="w-full h-full object-cover">
                     <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 md:hidden">
                        <h2 class="text-3xl font-bold text-white">${product.name}</h2>
                     </div>
                </div>
                <div class="p-8 md:p-12 flex flex-col justify-center">
                    <span class="text-[#00dc82] font-bold tracking-wider uppercase text-sm mb-2">${product.category}</span>
                    <h2 class="text-4xl font-bold mb-4 hidden md:block">${product.name}</h2>
                    <p class="text-2xl font-bold text-white mb-6">$${product.price} <span class="text-sm text-gray-400 font-normal">/ ${product.unit}</span></p>
                    
                    <p class="text-gray-300 mb-8 leading-relaxed">
                        Freshly harvested ${product.name.toLowerCase()}. Grown organically ensuring the highest nutritional value and taste. Perfect for your daily healthy diet.
                    </p>
                    
                    <div class="flex gap-4">
                         <div class="flex items-center gap-3 bg-white/5 px-4 rounded-xl border border-white/10">
                            <button class="text-xl hover:text-[#00dc82]" onclick="changeModalQuantity(-1)">-</button>
                            <span id="modal-qty" class="font-mono text-lg font-bold w-6 text-center">1</span>
                            <button class="text-xl hover:text-[#00dc82]" onclick="changeModalQuantity(1)">+</button>
                        </div>
                        <button onclick="addToCart('${product.id}', parseInt(document.getElementById('modal-qty').innerText)); closeProductDetail()" 
                                class="flex-1 btn-primary py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    // Small delay for fade in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.glass-card').classList.remove('scale-95');
        modal.querySelector('.glass-card').classList.add('scale-100');
    });
}

function closeProductDetail() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.glass-card').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function changeModalQuantity(change) {
    const qtyEl = document.getElementById('modal-qty');
    let current = parseInt(qtyEl.innerText);
    current += change;
    if (current < 1) current = 1;
    qtyEl.innerText = current;
}

function renderProducts(containerId, filterCategory = 'All', limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let filtered = products;
    if (filterCategory !== 'All') {
        filtered = products.filter(p => p.category === filterCategory);
    }

    if (limit) {
        filtered = filtered.slice(0, limit);
    }

    // Delay slightly for loading effect if needed, or render immediately
    container.innerHTML = filtered.map(createProductCard).join('');
}

// --- 3. UI Interactions ---

function showToast(msg, type = 'success') {
    // If type is cart, show a specialized bottom sheet/popup
    if (type === 'cart') {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-5 glass px-6 py-4 rounded-2xl border border-[#00dc82]/30 z-[60] flex items-center gap-4 shadow-2xl animate-fade-in-up w-11/12 md:w-auto max-w-sm';
        toast.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-[#00dc82]/20 flex items-center justify-center text-[#00dc82]">
                <i class="fa-solid fa-cart-plus"></i>
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-sm">Added to Cart</h4>
                <p class="text-xs text-gray-400">${msg}</p>
            </div>
            <a href="cart.html" class="text-[#00dc82] text-sm font-bold hover:underline">View</a>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 glass px-6 py-3 rounded-xl border-l-4 border-accent z-50 animate-bounce flex items-center gap-3 shadow-2xl';
    toast.innerHTML = `<i class="fa-solid fa-check-circle text-accent"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        menu.classList.add('animate-fade-in-up');
    }
}

// Close mobile menu on link click
document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('mobile-menu').classList.add('hidden');
    });
});

// Initialize Supabase (only if available)
let supabase;
if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Checkout Logic
async function processPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('pay-btn');
    const originalText = btn.innerHTML;

    // Get Form Values
    const form = document.getElementById('checkout-form');
    const customerName = form.querySelector('input[placeholder="John Doe"]').value;
    const address = form.querySelector('input[placeholder="123 Green Street, Dhaka"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const note = form.querySelector('textarea').value;

    // Calculate Total
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const totalAmount = subtotal + 5; // + Shipping

    btn.innerHTML = `<div class="loader ease-linear rounded-full border-2 border-t-2 border-gray-200 h-5 w-5 mx-auto"></div>`;
    btn.disabled = true;

    try {
        if (!supabase) {
            throw new Error("Supabase client not initialized. Check configuration.");
        }

        // Insert into Supabase
        const { data, error } = await supabase
            .from('orders')
            .insert([
                {
                    customer_name: customerName,
                    address: address,
                    phone: phone,
                    note: note,
                    total_amount: totalAmount,
                    items: cart,
                    status: 'pending'
                }
            ])
            .select();

        if (error) throw error;

        // GTM Data Layer - Purchase
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'purchase',
            ecommerce: {
                transaction_id: data[0].id,
                value: totalAmount,
                currency: 'USD',
                shipping: 5.00,
                items: cart.map(item => ({
                    item_id: item.id,
                    item_name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }))
            }
        });

        // Clear Cart
        cart = [];
        updateCartUI();

        // Redirect to success page
        showToast("Payment Successful! Redirecting...");
        setTimeout(() => {
            window.location.href = `success.html?id=${data[0].id}`;
        }, 1000);

    } catch (err) {
        console.error('Order Error:', err);
        showToast("Failed to place order. Please try again.", "error"); // Fixed toast type
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// --- 4. Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadProducts(); // Fetch data
    updateCartUI();

    // Home Page
    if (document.getElementById('home-products-grid')) {
        renderProducts('home-products-grid', 'All', 4);
    }

    // Products Page
    if (document.getElementById('all-products-grid')) {
        renderProducts('all-products-grid', 'All');

        // Filter Buttons
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                buttons.forEach(b => {
                    b.classList.remove('bg-[#00dc82]', 'text-[#003d33]');
                    b.classList.add('glass');
                });
                e.target.classList.remove('glass');
                e.target.classList.add('bg-[#00dc82]', 'text-[#003d33]');

                // Filter
                const category = e.target.dataset.category;
                renderProducts('all-products-grid', category);
            });
        });

        // Search
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = products.filter(p => p.name.toLowerCase().includes(term));
                const container = document.getElementById('all-products-grid');
                container.innerHTML = filtered.map(createProductCard).join('');
            });
        }
    }

    const payForm = document.getElementById('checkout-form');
    if (payForm) payForm.addEventListener('submit', processPayment);

    // 3D Tilt Effect
    // 3D Tilt Effect - Desktop Only
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.hover-3d');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (x > 0 && x < rect.width && y > 0 && y < rect.height) {
                    const xRot = ((y - rect.height / 2) / rect.height) * -10;
                    const yRot = ((x - rect.width / 2) / rect.width) * 10;
                    card.style.transform = `perspective(1000px) rotateX(${xRot}deg) rotateY(${yRot}deg) scale(1.02)`;
                } else {
                    card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
                }
            });
        });
    }
});
