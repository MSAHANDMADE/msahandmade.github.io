// --------------------  MSA CART  --------------------
const CART_KEY = 'msa_cart_v1';
const SHIPPING = 17; // cost livrare fix

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

// CRUD coș
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
  else cart.push({...item, qty: item.qty || 1});
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function changeQty(id, delta) {
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1, p.qty+delta)} : p);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function removeItem(id) {
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function clearCart() { saveCart([]); if (window.renderCart) window.renderCart(); }

// UI
function money(v){ return v.toFixed(0) + ' RON'; }

window.renderCart = function renderCart() {
  const root = document.getElementById('cart-root');
  const empty = document.getElementById('cart-empty');
  const totalsBox = document.getElementById('totals-box');
  const subtotalText = document.getElementById('subtotal-text');
  const shippingText = document.getElementById('shipping-text');
  const grandText = document.getElementById('grand-text');

  const cart = getCart();
  if (!cart.length) {
    root.innerHTML = '';
    empty.style.display = 'block';
    totalsBox.style.display = 'none';
    return;
  }

  empty.style.display = 'none';

  const rows = cart.map(p => `
    <div class="cart-row">
      <div class="cart-title">${p.name}</div>
      <div>Preț: ${money(p.price)}</div>
      <div>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
        <span style="min-width:24px; display:inline-block; text-align:center;">${p.qty}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
      </div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const total = subtotal + SHIPPING;

  root.innerHTML = rows;
  totalsBox.style.display = 'block';
  subtotalText.textContent = money(subtotal);
  shippingText.textContent = money(SHIPPING);
  grandText.textContent = money(total);
};

// PF / PJ + mailto
window.toggleCompany = function(show){
  const block = document.getElementById('company-block');
  block.style.display = show ? 'grid' : 'none';
  const firma = document.querySelector('input[name="firma"]');
  const cui = document.querySelector('input[name="cui"]');
  if (firma && cui) { firma.required = show; cui.required = show; }
};

window.placeOrderViaEmail = function(form){
  const cart = getCart();
  if (!cart.length) { alert('Coșul este gol.'); return false; }

  const tip_client = (new FormData(form)).get('tip_client') || 'pf';
  const nume = form.nume.value.trim();
  const prenume = form.prenume.value.trim();
  const telefon = form.telefon.value.trim();
  const judet = form.judet.value.trim();
  const oras = form.oras.value.trim();
  const cod_postal = form.cod_postal.value.trim();
  const adresa = form.adresa.value.trim();
  const mentiuni = form.mentiuni.value.trim();

  let firma = '', cui = '';
  if (tip_client === 'pj') { firma = form.firma.value.trim(); cui = form.cui.value.trim(); }

  if (!nume || !prenume || !telefon || !judet || !oras || !cod_postal || !adresa) {
    alert('Te rog completează toate câmpurile obligatorii.');
    return false;
  }

  const subtotal = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const total = subtotal + SHIPPING;
  const itemsText = cart.map(p => `${p.name} × ${p.qty} × ${p.price} RON`).join('%0A');

  const subject = encodeURIComponent('Comandă nouă – msahandmade.ro');
  const lines = [
    `Tip client: ${tip_client === 'pj' ? 'Persoană juridică' : 'Persoană fizică'}`,
    (tip_client==='pj' ? `Firmă: ${firma}%0ACUI: ${cui}` : ''),
    `Nume: ${nume}%0APrenume: ${prenume}%0ATelefon: ${telefon}`,
    `Județ: ${judet}%0AOraș: ${oras}%0ACod poștal: ${cod_postal}`,
    `Adresă: ${adresa}`,
    (mentiuni ? `Mențiuni: ${mentiuni}` : ''),
    '',
    'Produse:',
    itemsText,
    '',
    `Subtotal: ${subtotal} RON`,
    `Livrare: ${SHIPPING} RON`,
    `TOTAL: ${total} RON`
  ].filter(Boolean).join('%0A');

  const to = 'msahandmade.contact@gmail.com';
  window.location.href = `mailto:${to}?subject=${subject}&body=${encodeURIComponent(lines)}`;
  return false;
};

// init
updateCartCount();
if (document.getElementById('cart-root')) renderCart();
