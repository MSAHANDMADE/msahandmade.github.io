// ----------------------- MSA CART -----------------------
const CART_KEY = 'msa_cart_v1';

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

function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty += item.qty || 1;
  else cart.push({...item, qty: item.qty || 1});
  saveCart(cart);
  if (window.msaToast) msaToast('Adăugat în coș ✔');
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
function clearCart() {
  saveCart([]);
  if (window.renderCart) window.renderCart();
}

// Trimitere comandă prin e-mail (plata la livrare)
function placeOrderViaEmail(form) {
  const cart = getCart();
  if (!cart.length) { alert('Coșul este gol.'); return false; }

  const nume = form.nume.value.trim();
  const telefon = form.telefon.value.trim();
  const adresa = form.adresa.value.trim();
  const mesaj = form.mesaj.value.trim();

  if (!nume || !telefon || !adresa) {
    alert('Te rog completează Nume, Telefon și Adresă.');
    return false;
  }

  const total = cart.reduce((s,p)=>s + p.price * p.qty, 0);
  const itemsText = cart.map(p => `• ${p.name} x ${p.qty} — ${p.price} RON`).join('%0A');
  const subject = encodeURIComponent('Comandă nouă — msahandmade.ro');
  const body = encodeURIComponent(
`Bună!

Doresc comandă cu plata la livrare:

${decodeURIComponent(itemsText)}
Total: ${total} RON

Nume: ${nume}
Telefon: ${telefon}
Adresă: ${adresa}
Mesaj: ${mesaj}

Mulțumesc!`
  );

  window.location.href = `mailto:msahandmade.contact@gmail.com?subject=${subject}&body=${body}`;
  return false;
}

document.addEventListener('DOMContentLoaded', updateCartCount);

// mic toast
window.msaToast = (t) => {
  let el = document.getElementById('msa-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'msa-toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#333;color:#fff;padding:10px 14px;border-radius:999px;opacity:.95;font-size:14px;z-index:9999';
    document.body.appendChild(el);
  }
  el.textContent = t;
  el.style.display='block';
  setTimeout(()=>{el.style.display='none'}, 1600);
};
// --------------------- /MSA CART ------------------------
