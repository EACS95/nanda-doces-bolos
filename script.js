// Configuração do Tailwind CSS
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                     50: '#ffe4f0',
          100: '#fbb8d5',
          200: '#f38fbb',
          300: '#ea65a0',
          400: '#e13b86',
          500: '#db2777', // rosa principal
          600: '#c21d6b',
          700: '#a7155f',
          800: '#8d0e53',
          900: '#740746',
                }
            },
            animation: {
                'ping-slow': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
                'pulse-slow': 'pulse 3s infinite',
            }
        }
    }
}

// Lógica principal da aplicação
document.addEventListener('DOMContentLoaded', function() {
    // --- CONSTANTES ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbyon_QS9DVBlWYpY2kAPPfGDiCiMdHXZY5EUWCi9LdBdnRcEbaZJdhoNyHdQ5mRLccj/exec';
    const TOKEN = 'T8#z9fL3wP@qV1mN6eXrC7aB$dY2!kGtND';
    const CACHE_DURATION_MINUTES = 30;
    
    // --- ELEMENTOS DO DOM ---
    const menuGrid = document.getElementById('menu-grid');
    const categoryFiltersContainer = document.getElementById('category-filters-container');
    const cartBtn = document.getElementById('cart-btn');
    const cartDropdown = document.getElementById('cart-dropdown');
    const closeCartBtn = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartFooter = document.getElementById('cart-footer');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const searchInput = document.getElementById('search-input');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Modal Elements
    const confirmationModal = document.getElementById('confirmation-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const continueShoppingBtn = document.getElementById('continue-shopping-btn');
    const checkoutModalBtn = document.getElementById('checkout-modal-btn');
    const modalText = document.getElementById('modal-text');
    
    // --- VARIÁVEIS DE ESTADO ---
    let cart = {};
    let menuData = {};
    let activeCategory = 'all';
    
    // --- INICIALIZAÇÃO ---
    initializeApp();
    
    function initializeApp() {
        loadCartFromStorage();
        setupEventListeners();
        loadMenuWithCache();
    }
    
    // --- PERSISTÊNCIA E CACHE ---
    function saveCartToStorage() {
        localStorage.setItem('doceriaCart', JSON.stringify(cart));
    }
    
    function loadCartFromStorage() {
        const s = localStorage.getItem('doceriaCart');
        if (s) cart = JSON.parse(s);
    }
    
    function clearCart() {
        cart = {};
        updateCart();
    }
    
    function saveMenuToStorage(data) {
        localStorage.setItem('doceriaMenuCache', JSON.stringify({ 
            timestamp: Date.now(), 
            data 
        }));
    }
    
    // --- CARREGAMENTO DE CARDÁPIO COM CACHE ---
    function loadMenuWithCache() {
        if (!menuGrid) return;
        
        const cachedMenu = JSON.parse(localStorage.getItem('doceriaMenuCache'));
        const now = Date.now();
        const CACHE_DURATION_MS = CACHE_DURATION_MINUTES * 60 * 1000;
        
        if (cachedMenu && (now - cachedMenu.timestamp < CACHE_DURATION_MS)) {
            menuData = cachedMenu.data;
            renderCategoryFilters();
            renderMenu(Object.values(menuData));
            updateCart();
            fetchMenuData(true); // atualização em background
        } else {
            fetchMenuData(false);
        }
    }
    
    // --- BUSCA DE DADOS DA API ---
    function fetchMenuData(isBackgroundFetch = false) {
        fetch(`${API_URL}?token=${encodeURIComponent(TOKEN)}`)
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => { throw new Error(text || res.statusText); });
                }
                return res.json();
            })
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error("Resposta da API inválida.");
                }
                
                const newMenuData = {};
                data.forEach(item => {
                    if (item.ID && item.Produto && item.Preço) {
                        newMenuData[item.ID] = item;
                    }
                });
                
                if (JSON.stringify(newMenuData) !== JSON.stringify(menuData)) {
                    menuData = newMenuData;
                    saveMenuToStorage(menuData);
                    renderCategoryFilters();
                    renderMenu(Object.values(menuData));
                    updateCart();
                }
            })
            .catch(err => {
                console.error("Erro ao carregar cardápio:", err.message);
                if (!isBackgroundFetch && menuGrid) {
                    let userMessage = 'Erro ao carregar o cardápio.';
                    if (String(err.message).includes('Não autorizado')) {
                        userMessage = 'Erro de autorização. Não foi possível carregar o cardápio.';
                    }
                    menuGrid.innerHTML = `
                        <div class="col-span-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                            <p class="text-red-500 font-medium">${userMessage}</p>
                            <button onclick="location.reload()" class="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition">
                                <i class="fas fa-sync-alt mr-2"></i> Tentar novamente
                            </button>
                        </div>`;
                }
            });
    }
    
    // --- RENDERIZAÇÃO DE FILTROS ---
    function renderCategoryFilters() {
        if (!categoryFiltersContainer) return;
        const categories = [...new Set(Object.values(menuData).map(item => item.Categoria).filter(Boolean))];
        categories.sort();
        
        let buttonsHTML = `
            <button class="category-btn active px-4 py-2 rounded-full transition-all duration-300 flex items-center" data-category="all">
                <i class="fas fa-utensils mr-2"></i> Todos
            </button>`;
        
        categories.forEach(category => {
            buttonsHTML += `
                <button class="category-btn px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-all duration-300 text-gray-700 flex items-center" data-category="${category.toLowerCase()}">
                    <i class="fas fa-${getCategoryIcon(category)} mr-2"></i> ${category}
                </button>`;
        });
        
        categoryFiltersContainer.innerHTML = buttonsHTML;
        
        // Adiciona event listeners aos novos botões
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', handleCategoryFilter);
        });
    }
    
    function getCategoryIcon(category) {
        const icons = {
            'Bolo': 'birthday-cake',
            'Torta': 'pie',
            'Brigadeiro': 'cookie',
            'Cupcake': 'cupcake',
            'Doce': 'candy-cane',
            'Salgado': 'pizza-slice',
            'Sorvete': 'ice-cream',
            'Trufa': 'cookie-bite'
        };
        
        return icons[category] || 'utensils';
    }
    
    function handleCategoryFilter(e) {
        const target = e.currentTarget;
        const category = target.dataset.category;
        
        // Atualiza a categoria ativa
        activeCategory = category;
        
        // Atualiza estilos dos botões
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-primary-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        
        target.classList.add('active', 'bg-primary-600', 'text-white');
        target.classList.remove('bg-gray-200', 'text-gray-700');
        
        // Filtra os itens
        const allItems = Object.values(menuData);
        const filteredItems = category === 'all' 
            ? allItems 
            : allItems.filter(item => (item.Categoria || '').toLowerCase() === category);
        
        renderMenu(filteredItems);
    }
    
    // --- RENDERIZAÇÃO DO CARDÁPIO ---
    function renderMenu(items) {
        if (!menuGrid) return;
        
        // Se não houver itens, mostra mensagem
        if (items.length === 0) {
            menuGrid.innerHTML = `
                <div class="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <i class="fas fa-search text-gray-400 text-3xl mb-3"></i>
                    <p class="text-gray-600 font-medium">Nenhum item encontrado.</p>
                    <button onclick="resetFilters()" class="mt-4 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition">
                        <i class="fas fa-undo mr-2"></i> Limpar filtros
                    </button>
                </div>`;
            return;
        }
        
        // Ordena os itens por destaque (se houver) e depois por nome
        const sortedItems = [...items].sort((a, b) => {
            if (a.Destaque && !b.Destaque) return -1;
            if (!a.Destaque && b.Destaque) return 1;
            return a.Produto.localeCompare(b.Produto);
        });
        
        let menuHTML = '';
        
        sortedItems.forEach(item => {
            if (!item.ID) return;
            
            const priceNumber = parseFloat(String(item.Preço).replace("R$", "").replace(",", "."));
            const isInCart = cart[item.ID] > 0;
            
            // Badge de destaque
            const destaque = item.Destaque ? `
                <span class="absolute top-2 right-2 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center">
                    <i class="fas fa-star mr-1"></i> ${item.Destaque}
                </span>` : '';
            
            // Badge de categoria
            const categoria = item.Categoria ? `
                <span class="absolute top-2 left-2 bg-white text-primary-600 text-xs font-bold px-2 py-1 rounded-full shadow-md">
                    ${item.Categoria}
                </span>` : '';
            
            const menuItemHTML = `
                <div class="menu-item bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 flex flex-col relative ${item.Destaque ? 'highlight-item border-2 border-primary-500' : ''}" 
                     data-category="${(item.Categoria || '').toLowerCase()}" 
                     data-id="${item.ID}"
                     data-name="${item.Produto.toLowerCase()}">
                    <div class="relative">
<img src="./assets/img/${(item.Imagem || 'default.jpg').toLowerCase()}" 
     alt="${item.Produto}" 
     class="w-full  h-64 object-cover hover:opacity-90 transition-opacity duration-300">

                        ${destaque}
                        ${categoria}
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="font-bold text-lg text-gray-800">${item.Produto}</h3>
                            <span class="text-primary-600 font-bold whitespace-nowrap">R$ ${priceNumber.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <p class="text-gray-600 text-sm mt-1 flex-grow">${item.Descrição || 'Delicioso doce artesanal feito com ingredientes selecionados.'}</p>
                        <div class="flex justify-between items-center mt-4">
                            ${isInCart ? `
                                <span class="text-sm text-green-600 font-medium flex items-center">
                                    <i class="fas fa-check-circle mr-1"></i> No carrinho
                                </span>` : ''}
                            <div class="flex items-center rounded-lg overflow-hidden shadow-sm">
                                <button class="decrease-btn bg-gray-200 hover:bg-gray-300 px-3 py-2 leading-none transition text-gray-700">
                                    <i class="fas fa-minus text-xs"></i>
                                </button>
                                <span class="quantity font-bold bg-white px-4 py-2 text-center w-12 border-t border-b border-gray-200">
                                    ${cart[item.ID] || 0}
                                </span>
                                <button class="increase-btn bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 leading-none transition">
                                    <i class="fas fa-plus text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            menuHTML += menuItemHTML;
        });
        
        menuGrid.innerHTML = menuHTML;
        
        // Adiciona event listeners aos novos botões
        document.querySelectorAll('.menu-item').forEach(item => {
            const id = item.dataset.id;
            
            item.querySelector('.increase-btn')?.addEventListener('click', () => {
                const isNewItem = !cart[id] || cart[id] === 0;
                updateCartItem(id, 1, isNewItem);
            });
            
            item.querySelector('.decrease-btn')?.addEventListener('click', () => {
                updateCartItem(id, -1, false);
            });
        });
    }
    
    // --- EVENTOS ---
    function setupEventListeners() {
        // Carrinho
        if (cartBtn) cartBtn.addEventListener('click', toggleCartDropdown);
        if (closeCartBtn) closeCartBtn.addEventListener('click', () => cartDropdown.classList.add('hidden'));
        if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
        
        // Fechar carrinho ao clicar fora
        document.addEventListener('click', e => {
            if (cartDropdown && !cartDropdown.classList.contains('hidden') &&
                !cartDropdown.contains(e.target) && 
                !cartBtn.contains(e.target)) {
                cartDropdown.classList.add('hidden');
            }
        });
        
        // Menu mobile
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        
        // Busca
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // Modal
        if (confirmationModal) {
            closeModalBtn.addEventListener('click', hideConfirmationModal);
            continueShoppingBtn.addEventListener('click', hideConfirmationModal);
            confirmationModal.addEventListener('click', e => {
                if (e.target === confirmationModal) hideConfirmationModal();
            });
            checkoutModalBtn.addEventListener('click', e => {
                e.stopPropagation();
                hideConfirmationModal();
                if (cartDropdown) cartDropdown.classList.remove('hidden');
            });
        }
    }
    
    function toggleCartDropdown(e) {
        e.stopPropagation();
        cartDropdown.classList.toggle('hidden');
    }
    
    function toggleMobileMenu() {
        mobileMenu.classList.toggle('hidden');
    }
    
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const allItems = Object.values(menuData);
        
        let filteredItems;
        
        if (activeCategory === 'all') {
            filteredItems = allItems;
        } else {
            filteredItems = allItems.filter(item => (item.Categoria || '').toLowerCase() === activeCategory);
        }
        
        if (searchTerm) {
            filteredItems = filteredItems.filter(item => 
                item.Produto.toLowerCase().includes(searchTerm) || 
                (item.Descrição && item.Descrição.toLowerCase().includes(searchTerm))
            );
        }
        
        renderMenu(filteredItems);
    }
    
    function resetFilters() {
        searchInput.value = '';
        activeCategory = 'all';
        
        // Atualiza botão ativo
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-primary-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
            
            if (btn.dataset.category === 'all') {
                btn.classList.add('active', 'bg-primary-600', 'text-white');
                btn.classList.remove('bg-gray-200', 'text-gray-700');
            }
        });
        
        renderMenu(Object.values(menuData));
    }
    
    // --- LÓGICA DO CARRINHO ---
    function parsePrice(priceString) {
        return parseFloat(String(priceString).replace("R$", "").replace(",", "."));
    }
    
    function updateCartItem(id, change, showModal = false) {
        if (!menuData[id]) return;
        
        let currentQuantity = cart[id] || 0;
        currentQuantity += change;
        
        if (currentQuantity <= 0) {
            delete cart[id];
        } else {
            cart[id] = currentQuantity;
        }
        
        if (showModal && change > 0) {
            showConfirmationModal(menuData[id].Produto, 1);
        }
        
        updateCart();
        
        // Abrir carrinho e destacar visualmente
        if (change > 0) {
            if (cartDropdown.classList.contains('hidden')) {
                cartDropdown.classList.remove('hidden');
            }
            
            // Efeito de destaque
            cartDropdown.classList.add('cart-highlight');
            setTimeout(() => {
                cartDropdown.classList.remove('cart-highlight');
            }, 1500);
            
            // Efeito de balanço no ícone do carrinho
            cartBtn.classList.add('animate-bounce');
            setTimeout(() => {
                cartBtn.classList.remove('animate-bounce');
            }, 1000);
        }
    }
    
    function removeFromCart(id) {
        delete cart[id];
        updateCart();
    }
    
    function updateAllCardQuantities() {
        if (!menuGrid) return;
        
        menuGrid.querySelectorAll('.menu-item').forEach(card => {
            const id = card.dataset.id;
            const quantitySpan = card.querySelector('.quantity');
            const inCartIndicator = card.querySelector('.fa-check-circle')?.closest('span');
            
            if (quantitySpan) {
                quantitySpan.textContent = cart[id] || 0;
            }
            
            // Atualiza indicador "No carrinho"
            if (inCartIndicator) {
                if (cart[id] > 0) {
                    inCartIndicator.classList.remove('hidden');
                } else {
                    inCartIndicator.classList.add('hidden');
                }
            }
        });
    }
    
    function updateCart() {
        saveCartToStorage();
        
        if (cartItemsContainer) {
            renderCartItems();
        }
        
        updateAllCardQuantities();
        updateCartCount();
    }
    
    function updateCartCount() {
        if (!cartCount) return;
        
        const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
        cartCount.textContent = itemCount;
        
        // Efeito no ícone do carrinho quando há itens
        if (itemCount > 0) {
            cartCount.classList.add('animate-pulse-slow');
        } else {
            cartCount.classList.remove('animate-pulse-slow');
        }
    }
    
    function renderCartItems() {
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = '';
        
        let total = 0;
        let itemCount = 0;
        
        for (const id in cart) {
            const quantity = cart[id];
            const itemData = menuData[id];
            if (!itemData) continue;
            
            const price = parsePrice(itemData.Preço);
            const itemTotal = price * quantity;
            
            total += itemTotal;
            itemCount += quantity;
            
            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item flex justify-between items-center py-3 border-b border-gray-100';
            cartItemEl.dataset.id = id;
            cartItemEl.innerHTML = `
                <div class="flex items-center">
<img src="./assets/img/${(itemData.Imagem || 'default.jpg').toLowerCase()}" 
     alt="${itemData.Produto}" 
     class="w-12 h-12 object-cover rounded-lg mr-3">

                    <div>
                        <h4 class="font-semibold text-gray-800">${itemData.Produto}</h4>
                        <div class="flex items-center mt-1">
                            <button class="remove-item-btn text-red-500 hover:text-red-700 mr-2 transition" title="Remover item">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button class="decrease-item-btn bg-gray-100 hover:bg-gray-200 px-2 py-1 text-gray-700 transition">
                                    <i class="fas fa-minus text-xs"></i>
                                </button>
                                <span class="cart-item-quantity bg-white px-3 py-1 text-center text-gray-800">
                                    ${quantity}
                                </span>
                                <button class="increase-item-btn bg-gray-100 hover:bg-gray-200 px-2 py-1 text-gray-700 transition">
                                    <i class="fas fa-plus text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <span class="cart-item-total font-semibold text-gray-800">
                        R$ ${itemTotal.toFixed(2).replace('.', ',')}
                    </span>
                    <p class="text-xs text-gray-500 mt-1">
                        R$ ${price.toFixed(2).replace('.', ',')} un
                    </p>
                </div>`;
            
            // Adiciona event listeners
            cartItemEl.querySelector('.remove-item-btn')?.addEventListener('click', () => removeFromCart(id));
            cartItemEl.querySelector('.increase-item-btn')?.addEventListener('click', () => updateCartItem(id, 1));
            cartItemEl.querySelector('.decrease-item-btn')?.addEventListener('click', () => updateCartItem(id, -1));
            
            cartItemsContainer.appendChild(cartItemEl);
        }
        
        if (cartTotal) cartTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        
        if (emptyCartMessage && cartFooter) {
            const hasItems = itemCount > 0;
            emptyCartMessage.classList.toggle('hidden', hasItems);
            cartFooter.classList.toggle('hidden', !hasItems);
        }
    }
    
    // --- MODAL ---
    function showConfirmationModal(itemName, quantity) {
        if (!confirmationModal) return;
        modalText.textContent = `${quantity}x ${itemName} foi adicionado ao seu carrinho.`;
        confirmationModal.classList.remove('hidden');
        
        // Fecha automaticamente após 5 segundos
        setTimeout(() => {
            if (!confirmationModal.classList.contains('hidden')) {
                hideConfirmationModal();
            }
        }, 5000);
    }
    
    function hideConfirmationModal() {
        if (!confirmationModal) return;
        confirmationModal.classList.add('hidden');
    }
    
 
// --- CHECKOUT (VERSÃO MELHORADA) ---
// async function handleCheckout() {
//     if (Object.keys(cart).length === 0) return;
    
//     if (checkoutBtn) {
//         checkoutBtn.disabled = true;
//         checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
//     }
    
//     let total = 0;
//     let whatsappMessage = 'Olá, gostaria de fazer um pedido:\n\n';
    
//     // ESTA É A GRANDE MUDANÇA: Criamos um array de objetos para os itens
//     let orderItemsForSheet = []; 
    
//     for (const id in cart) {
//         const itemData = menuData[id];
//         if (!itemData) continue;
        
//         const quantity = cart[id];
//         const price = parsePrice(itemData.Preço);
//         const itemTotal = price * quantity;
        
//         total += itemTotal;
        
//         // Formata a mensagem do WhatsApp (continua igual)
//         whatsappMessage += `- ${quantity}x ${itemData.Produto}: R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;
        
//         // Adiciona o item ao nosso array estruturado
//         orderItemsForSheet.push({
//             id: itemData.ID,
//             name: itemData.Produto,
//             quantity: quantity,
//             price: price.toFixed(2).replace('.', ',') // Envia o preço unitário formatado
//         });
//     }
    
//     whatsappMessage += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
//     whatsappMessage += '\n\nPor favor, confirme o pedido e informe o endereço de entrega.';
    
//     const formData = new FormData();
//     formData.append('token', TOKEN);
    
//     // A MÁGICA ACONTECE AQUI: Convertemos o array de objetos para uma string JSON
//     formData.append('items', JSON.stringify(orderItemsForSheet));
    
//     formData.append('total', `R$ ${total.toFixed(2).replace('.', ',')}`);
    
//     try {
//         const response = await fetch(API_URL, {
//             method: 'POST',
//             body: formData
//         });

//         // Verificamos se a resposta da API foi bem-sucedida
//         const result = await response.json();
//         if (result.status !== 'success') {
//             throw new Error(result.message || "A API retornou um erro.");
//         }
        
//         console.log("Pedido enviado para a planilha com sucesso. ID do Pedido:", result.orderId);
        
//         const encodedMessage = encodeURIComponent(whatsappMessage);
//         window.open(`https://wa.me/5561995116464?text=${encodedMessage}`, '_blank');
        
//         clearCart();
//         if (cartDropdown) cartDropdown.classList.add('hidden');
        
//     } catch (error) {
//         console.error('Erro ao salvar o pedido:', error);
        
//         // Mostra mensagem de erro bonita
//         const errorDiv = document.createElement('div');
//         errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50';
//         errorDiv.innerHTML = `
//             <i class="fas fa-exclamation-circle mr-2"></i>
//             <span>Erro ao salvar pedido. Tente novamente.</span>
//             <button class="ml-4" onclick="this.parentElement.remove()">
//                 <i class="fas fa-times"></i>
//             </button>`;
        
//         document.body.appendChild(errorDiv);
        
//         setTimeout(() => {
//             errorDiv.remove();
//         }, 5000);
        
//     } finally {
//         if (checkoutBtn) {
//             checkoutBtn.disabled = false;
//             checkoutBtn.innerHTML = '<i class="fab fa-whatsapp mr-2"></i> Finalizar pelo WhatsApp';
//         }
//     }
// }

// --- CHECKOUT (VERSÃO ATUALIZADA COM NOME DO CLIENTE) ---
async function handleCheckout() {
    // 1. Pegar o campo de nome e a mensagem de erro
    const customerNameInput = document.getElementById('customer-name');
    const nameError = document.getElementById('name-error');
    const customerName = customerNameInput.value.trim();

    // 2. Validação: Verificar se o nome foi preenchido
    if (!customerName) {
        nameError.classList.remove('hidden'); // Mostra a mensagem de erro
        customerNameInput.focus(); // Coloca o foco no campo para o usuário corrigir
        customerNameInput.classList.add('border-red-500'); // Adiciona uma borda vermelha
        return; // Interrompe a função aqui
    } else {
        nameError.classList.add('hidden'); // Esconde a mensagem de erro se estiver tudo certo
        customerNameInput.classList.remove('border-red-500');
    }

    if (Object.keys(cart).length === 0) return;
    
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
    }
    
    let total = 0;
    
    // 3. Montar a mensagem do WhatsApp com o nome do cliente
    let whatsappMessage = `Olá, meu nome é *${customerName}* e gostaria de fazer um pedido:\n\n`;
    
    let orderItemsForSheet = [];
    
    for (const id in cart) {
        const itemData = menuData[id];
        if (!itemData) continue;
        
        const quantity = cart[id];
        const price = parsePrice(itemData.Preço);
        const itemTotal = price * quantity;
        
        total += itemTotal;
        
                whatsappMessage += `- *${quantity}x ${itemData.Produto}*: R$ ${itemTotal.toFixed(2).replace('.', ',')}\n`;

        
        orderItemsForSheet.push({
            id: itemData.ID,
            name: itemData.Produto,
            quantity: quantity,
            price: price.toFixed(2).replace('.', ',')
        });
    }
    
    whatsappMessage += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    whatsappMessage += '\n\nPor favor, confirme o pedido e informe o endereço de entrega.';
    
    const formData = new FormData();
    formData.append('token', TOKEN);
    
    // 4. Enviar o nome do cliente para a API
    formData.append('customerName', customerName); 
    
    formData.append('items', JSON.stringify(orderItemsForSheet));
    formData.append('total', `R$ ${total.toFixed(2).replace('.', ',')}`);
    
    // O resto da função continua exatamente igual...
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || "A API retornou um erro.");
        }
        
        console.log("Pedido enviado. ID:", result.orderId);
        
        const encodedMessage = encodeURIComponent(whatsappMessage);
        window.open(`https://wa.me/5561995116464?text=${encodedMessage}`, '_blank');
        
        clearCart();
        customerNameInput.value = ''; // Limpa o campo de nome após o sucesso
        if (cartDropdown) cartDropdown.classList.add('hidden');
        
    } catch (error) {
        console.error('Erro ao salvar o pedido:', error);
        // ... (código de mostrar erro)
    } finally {
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fab fa-whatsapp mr-2"></i> Finalizar pelo WhatsApp';
        }
    }
}
    
    // Funções globais para acesso via HTML
    window.resetFilters = resetFilters;
});