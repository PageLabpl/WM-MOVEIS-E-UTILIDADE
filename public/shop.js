/* =========================================================================
   WM Móveis & Utilidades — carrinho, favoritos e busca
   Compartilhado por index.html e product.html. Depende de products.js
   (getAllProducts, formatBR) já estar carregado antes deste arquivo.

   O carrinho e os favoritos ficam salvos no localStorage do navegador
   (funcionam mesmo sem estar logado). Se o cliente estiver logado
   (ver customer-auth.js), o carrinho também é sincronizado com a conta
   dele no backend, pra não perder o carrinho ao trocar de aparelho.
   ========================================================================= */

const CART_KEY = 'wm_cart';
const FAV_KEY = 'wm_favorites';

/* ---------------- Carrinho ---------------- */
function getCartRaw(){ return loadLS(CART_KEY, []); } // [{id, qty, color}]

function saveCartRaw(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadges();
  if(typeof syncCartToServer === 'function') syncCartToServer(cart);
}

function addToCart(id, qty, color){
  id = String(id); qty = qty || 1; color = color || null;
  const cart = getCartRaw();
  const existing = cart.find(i => i.id === id && i.color === color);
  if(existing) existing.qty += qty;
  else cart.push({ id, qty, color });
  saveCartRaw(cart);
}

function removeFromCart(id, color){
  id = String(id); color = color || null;
  saveCartRaw(getCartRaw().filter(i => !(i.id === id && i.color === color)));
}

function setCartQty(id, qty, color){
  id = String(id); color = color || null;
  const cart = getCartRaw();
  const item = cart.find(i => i.id === id && i.color === color);
  if(item){
    item.qty = Math.max(1, qty|0);
    saveCartRaw(cart);
  }
}

function clearCart(){ saveCartRaw([]); }

function getCartCount(){ return getCartRaw().reduce((s,i)=>s+i.qty, 0); }

/** Junta o carrinho salvo com os dados completos de cada produto
 *  (nome, preço, imagem) — precisa buscar o catálogo, por isso é async. */
async function getCartItems(){
  const cart = getCartRaw();
  if(!cart.length) return [];
  const all = await getAllProducts();
  return cart
    .map(item => {
      const p = all.find(pp => String(pp.id) === item.id);
      return p ? Object.assign({}, item, { product: p }) : null;
    })
    .filter(Boolean);
}

async function getCartTotal(){
  const items = await getCartItems();
  return items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
}

/** Atualiza todos os contadores/valores do carrinho na página
 *  (qualquer elemento com [data-cart-badge] ou [data-cart-total]). */
function updateCartBadges(){
  const count = getCartCount();
  document.querySelectorAll('[data-cart-badge]').forEach(el => { el.textContent = count; });
  getCartTotal().then(total => {
    document.querySelectorAll('[data-cart-total]').forEach(el => { el.textContent = 'R$ ' + formatBR(total); });
  });
}

/* ---------------- Favoritos ---------------- */
function getFavorites(){ return loadLS(FAV_KEY, []); }
function saveFavorites(list){
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
  if(typeof syncFavoritesToServer === 'function') syncFavoritesToServer(list);
}
function isFavorite(id){ return getFavorites().includes(String(id)); }
function toggleFavorite(id){
  id = String(id);
  let favs = getFavorites();
  const nowFav = !favs.includes(id);
  favs = nowFav ? [...favs, id] : favs.filter(f => f !== id);
  saveFavorites(favs);
  return nowFav;
}
async function getFavoriteProducts(){
  const favs = getFavorites();
  if(!favs.length) return [];
  const all = await getAllProducts();
  return all.filter(p => favs.includes(String(p.id)));
}

/* ---------------- Drawer do carrinho (painel lateral) ---------------- */
/** Injeta o HTML/CSS do drawer uma única vez por página, se ainda não existir. */
function ensureCartDrawer(){
  if(document.getElementById('cartDrawer')) return;
  const style = document.createElement('style');
  style.textContent = `
    .cart-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:998; display:none; }
    .cart-overlay.open { display:block; }
    .cart-drawer { position:fixed; top:0; right:-420px; width:100%; max-width:420px; height:100%;
      background:#151515; border-left:1px solid #2a2a2a; z-index:999; transition:right .25s ease;
      display:flex; flex-direction:column; color:#f2f0ea; font-family:'Inter',sans-serif; }
    .cart-drawer.open { right:0; }
    .cart-drawer-head { padding:18px 20px; border-bottom:1px solid #2a2a2a; display:flex; align-items:center; justify-content:space-between; }
    .cart-drawer-head h3 { font-family:'Playfair Display',serif; font-size:18px; color:#f2d675; }
    .cart-drawer-close { font-size:22px; line-height:1; color:#b8b3a8; cursor:pointer; }
    .cart-drawer-body { flex:1; overflow-y:auto; padding:14px 20px; }
    .cart-drawer-empty { color:#b8b3a8; font-size:13.5px; text-align:center; padding:40px 0; }
    .cart-item { display:flex; gap:12px; padding:14px 0; border-bottom:1px solid #2a2a2a; }
    .cart-item img { width:64px; height:64px; object-fit:cover; border-radius:6px; flex-shrink:0; background:#0a0a0a; }
    .cart-item-info { flex:1; min-width:0; }
    .cart-item-name { font-size:13px; font-weight:600; margin-bottom:4px; line-height:1.3; }
    .cart-item-price { font-size:13px; color:#f2d675; font-weight:700; }
    .cart-item-qty { display:flex; align-items:center; gap:8px; margin-top:8px; }
    .cart-item-qty button { width:24px; height:24px; border:1px solid #2a2a2a; border-radius:4px; color:#b8b3a8; font-size:13px; cursor:pointer; background:none; }
    .cart-item-remove { font-size:11.5px; color:#d64545; cursor:pointer; margin-top:6px; display:inline-block; }
    .cart-drawer-foot { border-top:1px solid #2a2a2a; padding:16px 20px 20px; }
    .cart-drawer-total { display:flex; justify-content:space-between; font-size:15px; font-weight:700; margin-bottom:14px; }
    .cart-drawer-total b { color:#f2d675; }
    .cart-checkout-btn { display:block; width:100%; text-align:center; background:#d4af37; color:#111; font-weight:700;
      font-size:13.5px; letter-spacing:.5px; padding:13px; border-radius:6px; cursor:pointer; border:none; }
    .cart-checkout-btn:hover { background:#f2d675; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'cart-overlay';
  overlay.id = 'cartOverlay';
  overlay.onclick = closeCart;

  const drawer = document.createElement('div');
  drawer.className = 'cart-drawer';
  drawer.id = 'cartDrawer';
  drawer.innerHTML = `
    <div class="cart-drawer-head">
      <h3>Meu carrinho</h3>
      <span class="cart-drawer-close" onclick="closeCart()">&times;</span>
    </div>
    <div class="cart-drawer-body" id="cartDrawerBody"></div>
    <div class="cart-drawer-foot">
      <div class="cart-drawer-total"><span>Total</span><b data-cart-total>R$ 0,00</b></div>
      <button class="cart-checkout-btn" onclick="checkoutViaWhatsapp()">FINALIZAR PELO WHATSAPP</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
}

async function renderCartDrawer(){
  ensureCartDrawer();
  const body = document.getElementById('cartDrawerBody');
  const items = await getCartItems();
  if(!items.length){
    body.innerHTML = '<div class="cart-drawer-empty">Seu carrinho está vazio.</div>';
  } else {
    body.innerHTML = items.map(i => `
      <div class="cart-item">
        <img src="${i.product.images[0]}" alt="${i.product.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${i.product.name}${i.color ? ` <span style="color:#b8b3a8;font-weight:400;">(${i.color})</span>` : ''}</div>
          <div class="cart-item-price">R$ ${formatBR(i.product.price)}</div>
          <div class="cart-item-qty">
            <button onclick="setCartQty('${i.id}', ${i.qty-1}, ${i.color ? `'${i.color}'` : 'null'}); renderCartDrawer();">−</button>
            <span>${i.qty}</span>
            <button onclick="setCartQty('${i.id}', ${i.qty+1}, ${i.color ? `'${i.color}'` : 'null'}); renderCartDrawer();">+</button>
          </div>
          <span class="cart-item-remove" onclick="removeFromCart('${i.id}', ${i.color ? `'${i.color}'` : 'null'}); renderCartDrawer();">Remover</span>
        </div>
      </div>
    `).join('');
  }
  updateCartBadges();
}

function openCart(){
  renderCartDrawer();
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
}
function closeCart(){
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if(overlay) overlay.classList.remove('open');
  if(drawer) drawer.classList.remove('open');
}

/** Monta uma mensagem com os itens do carrinho e abre o WhatsApp da loja
 *  pra finalizar o pedido — o site ainda não tem checkout com pagamento
 *  próprio, então esse é o caminho mais simples e imediato pra fechar venda. */
async function checkoutViaWhatsapp(){
  const items = await getCartItems();
  if(!items.length){ alert('Seu carrinho está vazio.'); return; }
  const total = await getCartTotal();
  let msg = 'Olá! Quero fazer um pedido:\n\n';
  items.forEach(i => { msg += `• ${i.qty}x ${i.product.name}${i.color ? ' ('+i.color+')' : ''} — R$ ${formatBR(i.product.price)}\n`; });
  msg += `\nTotal: R$ ${formatBR(total)}`;
  const phone = (window.WM_WHATSAPP_NUMBER || '').replace(/\D/g,'');
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ---------------- Busca ---------------- */
function normalizeSearch(s){
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function searchProducts(term){
  const q = normalizeSearch(term);
  if(!q) return [];
  const all = await getAllProducts();
  return all.filter(p =>
    normalizeSearch(p.name).includes(q) ||
    normalizeSearch(categoryLabel(p.category)).includes(q)
  );
}
