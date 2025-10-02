// ---------------- MSA CART ----------------
const CART_KEY = 'msa_cart_v1';
const SHIPPING_FEE = 17; // lei

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

// Adăugare / modificare / ștergere
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
  else cart.push({...item, qty: 1});
  saveCart(cart);
  if (window.msaToast) msaToast('Adăugat în coș ✔');
  if (window.renderCart) window.renderCart();
}
function changeQty(id, delta) {
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1,(p.qty||1)+delta)} : p);
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

// ——— Randare coș pe pagina cos.html ———
function money(v){ return v.toFixed(0) + ' RON'; }

window.renderCart = function renderCart() {
  const root = document.getElementById('cart-root');
  const cart = getCart();
  if (!root) return;

  if (!cart.length) {
    root.innerHTML = '<p>Coșul este gol.</p>';
    document.getElementById('cart-total').textContent = money(0);
    document.getElementById('cart-subtotal').textContent = money(0);
    document.getElementById('cart-shipping').textContent = money(0);
    return;
  }

  const rows = cart.map(p => `
    <div class="cart-row">
      <div class="cart-info">
        <div class="cart-title">${p.name}</div>
        <div class="cart-price">${money(p.price)} / buc</div>
      </div>
      <div class="cart-qty">
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <span>${p.qty}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price * p.qty)}</div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const shipping = SHIPPING_FEE;
  const total = subtotal + shipping;

  root.innerHTML = rows;
  document.getElementById('cart-subtotal').textContent = money(subtotal);
  document.getElementById('cart-shipping').textContent = money(shipping);
  document.getElementById('cart-total').textContent = money(total);
};

// ——— Trimitere comandă pe e-mail (plata la livrare) ———
function placeOrderViaEmail(form) {
  const cart = getCart();
  if (!cart.length) { alert('Coșul este gol.'); return false; }

  // Fields
  const tip = form.tip.value; // pf/pj
  const nume = form.nume.value.trim();
  const prenume = form.prenume.value.trim();
  const telefon = form.telefon.value.trim();
  const judet = form.judet.value.trim();
  const oras = form.oras.value.trim();
  const codpostal = form.codpostal.value.trim();
  const adresa = form.adresa.value.trim();
  const mentiuni = form.mentiuni.value.trim();

  if (!nume || !prenume || !telefon || !judet || !oras || !codpostal || !adresa) {
    alert('Te rog completează toate câmpurile obligatorii.');
    return false;
  }

  let firmaBlock = '';
  if (tip === 'pj') {
    const firma = form.firma.value.trim();
    const cui = form.cui.value.trim();
    if (!firma || !cui) {
      alert('Te rog completează Denumire firmă și CUI.');
      return false;
    }
    firmaBlock = `\n\nPersoană juridică:\nFirmă: ${firma}\nCUI: ${cui}`;
  }

  const itemsText = cart.map(p => `${p.name} x ${p.qty} = ${p.price*p.qty} RON`).join('%0A');
  const subtotal = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const total = subtotal + SHIPPING_FEE;

  const subject = encodeURIComponent('Comandă nouă – msahandmade.ro');
  const body = encodeURIComponent(
`Bună!

Comandă cu plata la livrare:

${decodeURIComponent(itemsText)}
Subtotal: ${subtotal} RON
Transport: ${SHIPPING_FEE} RON
TOTAL: ${total} RON

Date livrare:
Nume: ${nume} ${prenume}
Telefon: ${telefon}
Județ: ${judet}
Oraș: ${oras}
Cod poștal: ${codpostal}
Adresă: ${adresa}${firmaBlock}

Mențiuni:
${mentiuni || '-'}
`
  );

  // adresa ta de e-mail — schimb-o dacă ai alta
  window.location.href = `mailto:msahandmade.contact@gmail.com?subject=${subject}&body=${body}`;
  return false;
}

// inițializare badge coș în header
updateCartCount();
