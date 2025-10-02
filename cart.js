// ------------------- MSA CART — cart.js -------------------

const CART_KEY = 'msa_cart_v1';
const LIVRARE_COST = 17;

// ========== STORAGE ==========
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

// ========== HEADER BADGE ==========
function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// ========== CART ACTIONS ==========
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
  else cart.push({ ...item, qty: 1 });
  saveCart(cart);
  if (typeof renderCart === 'function') renderCart();
}
function changeQty(id, delta) {
  const cart = getCart().map(p =>
    p.id === id ? { ...p, qty: Math.max(1, (p.qty || 1) + delta) } : p
  );
  saveCart(cart);
  if (typeof renderCart === 'function') renderCart();
}
function removeItem(id) {
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  if (typeof renderCart === 'function') renderCart();
}

// ========== UI HELPERS ==========
function money(v) { return v.toFixed(2) + ' RON'; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function showStatus(msg, type='success'){
  const el = document.getElementById('status');
  if(!el) return;
  el.className = `status show ${type}`;
  el.textContent = msg;
}

// ========== RENDER CART (cos.html) ==========
function renderCart() {
  const cart = getCart();
  const root = document.getElementById('cart-items');
  const totals = document.getElementById('cart-totals');
  if (!root || !totals) return;

  if (!cart.length) {
    root.innerHTML = `<p>Coșul este gol.</p>`;
    totals.innerHTML = ``;
    // goliți și hidden-urile pentru formular
    setVal('f_items',''); setVal('f_subtotal',''); setVal('f_livrare',''); setVal('f_total','');
    return;
  }

  const rows = cart.map(p => `
    <div class="cart-row">
      <div class="cart-info"><strong>${p.name}</strong> — ${money(p.price)} / buc</div>
      <div class="cart-qty">
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <span>${p.qty}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price * p.qty)}</div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const livrare  = cart.length ? LIVRARE_COST : 0;
  const total    = subtotal + livrare;

  root.innerHTML = `<div class="cart-list">
    <div class="cart-head"><span>Produs</span><span>Cant.</span><span>Subtotal</span><span></span></div>
    ${rows}
  </div>`;

  totals.innerHTML = `
    <div class="cart-totals">
      <div>Subtotal: <strong>${money(subtotal)}</strong></div>
      <div>Livrare: <strong>${money(livrare)}</strong></div>
      <div class="cart-total">Total: <strong>${money(total)}</strong></div>
    </div>
  `;

  // pentru formular (FormSubmit)
  const itemsText = cart.map(p => `${p.name} x ${p.qty} (${money(p.price * p.qty)})`).join(', ');
  setVal('f_items', itemsText);
  setVal('f_subtotal', money(subtotal));
  setVal('f_livrare',  money(livrare));
  setVal('f_total',    money(total));
}

// ========== FORM (FormSubmit) ==========
function togglePJ(radio){
  const pj = document.getElementById('pj-fields');
  if(!pj) return;
  const val = radio && radio.value ? radio.value.toLowerCase() : '';
  pj.style.display = val.includes('jurid') ? 'block' : 'none';
}

function prepareAndSubmit(form){
  const cart = getCart();
  if(!cart.length){
    showStatus('Coșul este gol.', 'error');
    alert('Coșul este gol.');
    return false;
  }

  // validări minime
  const need = ['nume','prenume','telefon','email','judet','oras','adresa'];
  for(const k of need){
    if(!form[k] || !form[k].value.trim()){
      showStatus('Te rog completează toate câmpurile obligatorii.', 'error');
      alert('Te rog completează toate câmpurile obligatorii.');
      return false;
    }
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
  if(!emailOk){
    showStatus('Adresa de e-mail nu este validă.', 'error');
    alert('Adresa de e-mail nu este validă.');
    return false;
  }

  // calcule și sumar pentru pagina de „Mulțumim”
  try{
    const items = cart.map(p => ({ name: p.name, qty: p.qty, price: p.price }));
    const subtotal = items.reduce((s,it)=> s + it.price*it.qty, 0);
    const livrare  = LIVRARE_COST;
    const total    = subtotal + livrare;
    localStorage.setItem('msa_last_order_summary', JSON.stringify({ items, subtotal, livrare, total }));
  }catch(e){}

  // feedback UI
  const btn = document.getElementById('submitBtn');
  if(btn) btn.disabled = true;
  showStatus('Trimit comanda…', 'success');

  // NU golim coșul aici — se golește în multumesc.html după redirecționare
  // lăsăm submit-ul să continue către formsubmit.co
  return true;
}

// ========== INIT ==========
updateCartCount();
```0
