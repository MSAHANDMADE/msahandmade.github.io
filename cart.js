// ------------------- MSA CART -------------------

const CART_KEY = 'msa_cart_v1';
const LIVRARE_COST = 17;

// === Funcții de stocare ===
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

// === Contor produse în coș (icon sus) ===
function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// === Adăugare / schimbare / ștergere produse ===
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty += 1;
  else cart.push({ ...item, qty: 1 });
  saveCart(cart);
  renderCart();
}

function changeQty(id, delta) {
  const cart = getCart().map(p =>
    p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p
  );
  saveCart(cart);
  renderCart();
}

function removeItem(id) {
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  renderCart();
}

// === Randare coș ===
function renderCart() {
  const cart = getCart();
  const root = document.getElementById('cart-items');
  const totals = document.getElementById('cart-totals');

  if (!root || !totals) return;

  if (!cart.length) {
    root.innerHTML = `<p>Coșul este gol.</p>`;
    totals.innerHTML = ``;
    return;
  }

  const rows = cart.map(p => `
    <div class="cart-row">
      <div class="cart-info">
        <strong>${p.name}</strong> - ${money(p.price)} / buc
      </div>
      <div class="cart-qty">
        <button type="button" onclick="changeQty(${p.id},-1)">-</button>
        <span>${p.qty}</span>
        <button type="button" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price * p.qty)}</div>
      <button type="button" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const livrare = cart.length > 0 ? LIVRARE_COST : 0;
  const total = subtotal + livrare;

  root.innerHTML = `<div class="cart-list">${rows}</div>`;
  totals.innerHTML = `
    <p>Subtotal: <strong>${money(subtotal)}</strong></p>
    <p>Livrare: <strong>${money(livrare)}</strong></p>
    <p>Total: <strong>${money(total)}</strong></p>
  `;

  // set hidden inputs pentru formular
  const itemsText = cart.map(p => `${p.name} x ${p.qty} (${money(p.price * p.qty)})`).join(', ');
  setVal('f_items', itemsText);
  setVal('f_subtotal', money(subtotal));
  setVal('f_livrare', money(livrare));
  setVal('f_total', money(total));
}

// === Utilitare ===
function money(v) {
  return v.toFixed(2) + ' RON';
}
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// === Formular ===
function prepareAndSubmit(form) {
  const cart = getCart();
  if (!cart.length) {
    alert('Coșul este gol!');
    return false;
  }

  document.getElementById('submitBtn').disabled = true;
  setTimeout(() => { document.getElementById('submitBtn').disabled = false; }, 3000);

  clearCart(); // golește coșul după trimitere
  return true; // continuă spre formsubmit.co
}

// === Persoană juridică toggle ===
function togglePJ(radio) {
  const pj = document.getElementById('pj-fields');
  pj.style.display = (radio.value === "Persoană juridică") ? 'block' : 'none';
}

// init
updateCartCount();
