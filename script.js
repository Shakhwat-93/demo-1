// --- Global State ---
let cart = JSON.parse(localStorage.getItem('freshHarvestCart')) || [];

// --- Product Data ---
const products = [
    {
        id: 'p1',
        name: 'Rajshahi Mango',
        price: 12,
        category: 'Fruits',
        image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?q=80&w=600',
        unit: '1kg Box'
    },
    {
        id: 'p2',
        name: 'Fresh Spinach',
        price: 4,
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=600',
        unit: 'Organic Bunch'
    },
    {
        id: 'p3',
        name: 'Red Tomatoes',
        price: 6.50,
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=600',
        unit: '1kg Fresh'
    },
    {
        id: 'p4',
        name: 'Sweet Corn',
        price: 5,
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=600',
        unit: '3 Pcs Pack'
    },
    {
        id: 'p5',
        name: 'Organic Avocados',
        price: 15,
        category: 'Fruits',
        image: 'https://images.unsplash.com/photo-1523049673856-428689c8ae89?q=80&w=600',
        unit: '3 Pcs Box'
    },
    {
        id: 'p6',
        name: 'Red Strawberries',
        price: 9,
        category: 'Fruits',
        image: 'https://images.unsplash.com/photo-1464965911861-746a04b4b0a0?q=80&w=600',
        unit: '500g Pack'
    },
    {
        id: 'p7',
        name: 'Broccoli',
        price: 3.50,
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?q=80&w=600',
        unit: '1 Head'
    },
    {
        id: 'p8',
        name: 'Fresh Carrots',
        price: 4.20,
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=600',
        unit: '1kg Bunch'
    }
];

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

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    showToast(`${product.name} added to cart!`);
}

function removeFromCart(id) {
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
    return `
        <div class="glass-card rounded-3xl overflow-hidden group hover-3d h-full flex flex-col">
            <div class="relative h-56 overflow-hidden">
                <img src="${product.image}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="${product.name}">
                <div class="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    ${product.category}
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
                <button onclick="addToCart('${product.id}')" 
                        class="w-full mt-auto btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(0,220,130,0.3)] transition-all">
                    <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
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

function showToast(msg) {
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

// Checkout Logic
function processPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('pay-btn');
    const originalText = btn.innerHTML;

    btn.innerHTML = `<div class="loader ease-linear rounded-full border-2 border-t-2 border-gray-200 h-5 w-5 mx-auto"></div>`;
    btn.disabled = true;

    setTimeout(() => {
        cart = [];
        updateCartUI();
        document.getElementById('checkout-form').classList.add('hidden');
        document.getElementById('success-msg').classList.remove('hidden');
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast("Payment Successful! Order Placed.");
    }, 2000);
}

// --- 4. Initialization ---

document.addEventListener('DOMContentLoaded', () => {
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
});
