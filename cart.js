// ---------------------- MSA CART ----------------------
const CART_KEY = 'msa_cart_v1';
const ORDER_EMAIL = 'msahandmade.contact@gmail.com'; // ← schimbă aici dacă folosești alt email
const SHIPPING_FEE = 17; // RON, livrare la curier (se adaugă dacă există măcar 1 produs)

// ============ UTIL ============

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function money(v) { return v.toFixed(0) + ' RON'; }

// ============ PUBLIC (folosite din HTML) ============

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
  else cart.push({...item, qty: 1});
  saveCart(cart);
  if (window.msaToast) msaToast('Adăugat în coș ✔');
}

function changeQty(id, delta) {
  const cart = getCart().map(p => p.id === id ? {...p, qty: Math.max(1, (p.qty||1) + delta)} : p);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}

function removeItem(id) {
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}

function ClearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  if (window.renderCart) window.renderCart();
}

// ============ RENDER COȘ ============

function renderCart() {
  const root = document.getElementById('cart-root');
  const cart = getCart();

  if (!cart.length) {
    root.innerHTML = '<p>Coșul este gol.</p>';
    return;
  }

  const rows = cart.map(p => `
    <div class="cart-row">
      <div class="cart-info">
        <div class="cart-title">${p.name}</div>
        <div class="cart-price">${money(p.price)} / buc</div>
      </div>
      <div class="cart-qty">
        <button type="button" class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
        <span>${p.qty}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price * p.qty)}</div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s,p)=>s + p.price * p.qty, 0);
  const shipping = cart.length ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  root.innerHTML = `
    <div class="cart-list">${rows}</div>
    <div class="cart-total">
      Subtotal: <strong>${money(subtotal)}</strong><br>
      Livrare: <strong>${money(shipping)}</strong><br>
      Total: <strong>${money(total)}</strong>
    </div>
  `;
}

// ============ PLASARE COMANDĂ (PF/PJ) ============

function placeOrder(form) {
  const cart = getCart();
  if (!cart.length) { alert('Coșul este gol.'); return false; }

  const tip = (form.tip.value || 'fizica'); // fizica | juridica

  // date PF
  const nume = form.nume.value.trim();
  const prenume = form.prenume.value.trim();
  const telefon = form.telefon.value.trim();
  const judet = form.judet.value.trim();
  const oras = form.oras.value.trim();
  const codpostal = form.codpostal.value.trim();
  const adresa = form.adresa.value.trim();

  // comp (opțional doar la PJ)
  const firma = form.firma ? form.firma.value.trim() : '';
  const cui = form.cui ? form.cui.value.trim() : '';

  const mentiuni = (form.mentiuni.value || '').trim();

  // validări minime
  if (!nume || !prenume || !telefon || !judet || !oras || !codpostal || !adresa) {
    alert('Te rog completează Nume, Prenume, Telefon, Județ, Oraș, Cod poștal și Adresă.');
    return false;
  }
  if (tip === 'juridica' && (!firma || !cui)) {
    alert('Pentru persoană juridică completează Denumire firmă și CUI.');
    return false;
  }

  // totaluri
  const subtotal = cart.reduce((s,p)=>s + p.price * p.qty, 0);
  const shipping = SHIPPING_FEE;
  const total = subtotal + shipping;

  const itemsText = cart
    .map(p => `${p.name} x ${p.qty} = ${p.price * p.qty} RON`)
    .join('%0A');

  const subject = encodeURIComponent('Comandă nouă – msahandmade.ro');
  const lines = [
    `Tip client: ${tip === 'juridica' ? 'Persoană juridică' : 'Persoană fizică'}`,
    '',
    `Produse:`,
    itemsText,
    '',
    `Subtotal: ${subtotal} RON`,
    `Livrare: ${shipping} RON`,
    `TOTAL: ${total} RON`,
    '',
    `Nume: ${nume}`,
    `Prenume: ${prenume}`,
    `Telefon: ${telefon}`,
    `Județ: ${judet}`,
    `Oraș: ${oras}`,
    `Cod poștal: ${codpostal}`,
    `Adresă: ${adresa}`,
  ];

  if (tip === 'juridica') {
    lines.push(`Denumire firmă: ${firma}`);
    lines.push(`CUI: ${cui}`);
  }

  if (mentiuni) {
    lines.push('');
    lines.push(`Mențiuni: ${mentiuni}`);
  }

  const body = encodeURIComponent(lines.join('\n'));

  // deschide clientul de e-mail
  const href = `mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`;
  window.location.href = href;

  // păstrăm coșul plin până confirmă în email (poți goli dacă vrei)
  // ClearCart();

  return false; // nu trimite formularul clasic
}

// ============ Exporte globale (pt. HTML) ============
window.addToCart      = addToCart;
window.updateCartCount= updateCartCount;
window.renderCart     = renderCart;
window.clearCart      = ClearCart;
window.placeOrder     = placeOrder;
