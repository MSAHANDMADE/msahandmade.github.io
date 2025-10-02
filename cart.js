// ============ MSA CART ============

const CART_KEY = 'msa_cart_v1';

// ---- Utils stocare ----
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// ---- Acțiuni ----
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) { cart[i].qty = (cart[i].qty || 1) + 1; }
  else { cart.push({...item, qty: 1}); }
  saveCart(cart);
  if (window.msaToast) msaToast('Adăugat în coș ✔');
}
function changeQty(id, delta) {
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1, (p.qty||1)+delta)} : p);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function removeItem(id) {
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  if (window.renderCart) window.renderCart();
}

// ---- Randare coș (pentru cos.html) ----
window.renderCart = function renderCart(){
  const root = document.getElementById('cart-root');
  if (!root) return;

  const cart = getCart();
  if (!cart.length) {
    root.innerHTML = '<p>Coșul este gol.</p>';
    document.getElementById('totals')?.remove();
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

  const subtotal = cart.reduce((s,p)=>s+p.price*(p.qty||1),0);
  const shipping = 17; // livrare fixă
  const total = subtotal + shipping;

  root.innerHTML = `
    <div class="cart-list">${rows}</div>
    <div id="totals" class="cart-total">
      <div>Subtotal: <strong>${money(subtotal)}</strong></div>
      <div>Livrare: <strong>${money(shipping)}</strong></div>
      <div>Total: <strong>${money(total)}</strong></div>
    </div>
  `;
};

function money(v){ return v.toFixed(0) + ' RON'; }

// ---- Trimitere comandă către FormSubmit ----
function trimiteComanda(e){
  e.preventDefault();
  const form = e.target;
  const cart = getCart();

  if (!cart.length) { alert('Coșul este gol.'); return false; }

  // date client
  const nume     = form.nume.value.trim();
  const prenume  = form.prenume.value.trim();
  const email    = form.email.value.trim();
  const telefon  = form.telefon.value.trim();
  const judet    = form.judet.value.trim();
  const oras     = form.oras.value.trim();
  const codpostal= form.codpostal.value.trim();
  const adresa   = form.adresa.value.trim();
  const tip      = form.tip.value; // pf/pj
  const firma    = (form.firma?.value.trim() || '');
  const cui      = (form.cui?.value.trim() || '');
  const mentiuni = (form.mentiuni?.value.trim() || '');

  if (!nume || !prenume || !email || !telefon || !judet || !oras || !codpostal || !adresa) {
    alert('Te rog completează toate câmpurile obligatorii.');
    return false;
  }

  // totaluri
  const subtotal = cart.reduce((s,p)=>s+p.price*(p.qty||1),0);
  const shipping = 17;
  const total = subtotal + shipping;

  // listă produse
  const itemsText = cart.map(p => `${p.name} × ${p.qty} — ${p.price} RON`).join('%0A');

  // compunem mesajul
  const body =
`Tip client: ${tip==='pj' ? 'Persoană juridică' : 'Persoană fizică'}
${tip==='pj' ? `Firmă: ${firma}\nCUI: ${cui}\n` : ''}Nume: ${nume} ${prenume}
Email: ${email}
Telefon: ${telefon}
Adresă: ${adresa}, ${oraș}, ${judet}, ${codpostal}

Produse:
${decodeURIComponent(itemsText)}

Subtotal: ${subtotal} RON
Livrare: ${shipping} RON
TOTAL: ${total} RON

Mențiuni: ${mentiuni || '-'}`; // end body

  // punem textul în textarea <textarea name="message">
  document.getElementById('order_message').value = body;

  // trimitem formularul normal (FormSubmit se ocupă de e-mail și redirect)
  form.submit();
  return true;
}

// ---- Inițializare la încărcare pagină ----
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  const orderForm = document.getElementById('order-form');
  if (orderForm) orderForm.addEventListener('submit', trimiteComanda);
  if (document.getElementById('cart-root')) renderCart();
});
