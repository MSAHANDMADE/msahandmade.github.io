// --------------------- MSA CART ---------------------
const CART_KEY = 'msa_cart_v1';
const SHIPPING = 17;

// utilitare storage
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  const cnt = getCart().reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = cnt);
}

// acțiuni coș
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) { cart[i].qty = (cart[i].qty || 1) + 1; }
  else { cart.push({...item, qty: 1}); }
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

function clearCart() {
  saveCart([]);
  if (window.renderCart) window.renderCart();
}

// Randare coș
function money(v){ return v.toFixed(0) + ' RON'; }

window.renderCart = function renderCart(){
  const root = document.getElementById('cart-root');
  const totals = document.getElementById('totals');
  const cart = getCart();

  if (!root || !totals) return;

  if (!cart.length) {
    root.innerHTML = '<p>Coșul este gol.</p>';
    totals.innerHTML = '';
    return;
  }

  const rows = cart.map(p => `
    <div class="cart-row">
      <div class="cart-title">${p.name}</div>
      <div class="cart-price">${money(p.price)} / buc</div>
      <div class="cart-qty">
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <span>${p.qty}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price * p.qty)}</div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s,p)=> s + p.price * p.qty, 0);
  const shipping = SHIPPING;
  const total = subtotal + shipping;

  root.innerHTML = `
    <div class="cart-list">
      <div class="cart-head">
        <span>Produs</span><span>Preț</span><span>Cant.</span><span>Subtotal</span><span></span>
      </div>
      ${rows}
    </div>
  `;

  totals.innerHTML = `
    <div class="cart-totals">
      <div>Subtotal: <strong>${money(subtotal)}</strong></div>
      <div>Livrare: <strong>${money(shipping)}</strong></div>
      <div class="cart-total">Total: <strong>${money(total)}</strong></div>
    </div>
  `;
};

// Trimite comanda pe e-mail (mailto)
function placeOrderViaEmail(form){
  const cart = getCart();
  if (!cart.length){ alert('Coșul este gol.'); return false; }

  const isPJ = document.querySelector('input[name="tip"][value="juridica"]').checked;

  const nume = form.nume.value.trim();
  const prenume = form.prenume.value.trim();
  const telefon = form.telefon.value.trim();
  const oras = form.oras.value.trim();
  const judet = form.judet.value.trim();
  const cod = form.cod.value.trim();
  const adresa = form.adresa.value.trim();
  const firma = form.firma?.value.trim() || '';
  const cui = form.cui?.value.trim() || '';
  const mesaj = form.mesaj.value.trim();

  if (!nume || !prenume || !telefon || !oras || !judet || !adresa){
    alert('Te rog completează Nume, Prenume, Telefon, Oraș, Județ și Adresă.');
    return false;
  }
  if (isPJ && (!firma || !cui)){
    alert('Pentru persoană juridică completează Denumire firmă și CUI.');
    return false;
  }

  const subtotal = cart.reduce((s,p)=> s + p.price * p.qty, 0);
  const total = subtotal + SHIPPING;

  const itemsText = cart
    .map(p => `${p.name} × ${p.qty} = ${p.price * p.qty} RON`).join('%0A');

  const subject = encodeURIComponent('Comandă nouă – msahandmade.ro');
  const body = encodeURIComponent(
`Bună!

Detalii comandă:
${itemsText}

Subtotal: ${subtotal} RON
Livrare: ${SHIPPING} RON
TOTAL: ${total} RON

Tip client: ${isPJ ? 'Persoană juridică' : 'Persoană fizică'}
Nume: ${nume}
Prenume: ${prenume}
Telefon: ${telefon}
Oraș: ${oras}
Județ: ${judet}
Cod poștal: ${cod}
Adresă: ${adresa}
${isPJ ? `Denumire firmă: ${firma}
CUI: ${cui}` : ''}

Mențiuni: ${mesaj || '-'}
Mulțumesc!`
  );

  // pune aici adresa ta de e-mail
  const to = 'msahandmade.contact@gmail.com';
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  return false;
}

// init count în header
updateCartCount();
