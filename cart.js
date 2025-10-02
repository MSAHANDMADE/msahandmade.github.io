// -------------------- MSA CART --------------------
const CART_KEY = 'msa_cart_v2';

// --- utils storage + count badge ---
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

// --- public API folosit de pagini ---
function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty || 1) + 1;
  else cart.push({...item, qty: 1});
  saveCart(cart);
  if (window.msaToast) msaToast('Adăugat în coș ✔'); // opțional feedback
  if (window.renderCart) window.renderCart();        // dacă suntem pe cos.html
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
  saveCart([]);
  if (window.renderCart) window.renderCart();
}

// --- creare mailto cu sumar comanda ---
function placeOrderViaEmail(form) {
  const cart = getCart();
  if (!cart.length) { alert('Coșul este gol.'); return false; }

  // date client
  const tip = form.tip.value; // pf / pj
  const nume     = form.nume.value.trim();
  const prenume  = form.prenume.value.trim();
  const email    = form.email.value.trim();
  const telefon  = form.telefon.value.trim();
  const judet    = form.judet.value.trim();
  const oras     = form.oras.value.trim();
  const codp     = form.cod_postal.value.trim();
  const adresa   = form.adresa.value.trim();
  const mentiuni = form.mentiuni.value.trim();

  // PJ opționale
  const firma = form.firma ? form.firma.value.trim() : '';
  const cui   = form.cui ? form.cui.value.trim() : '';

  if (!nume || !prenume || !telefon || !adresa || !oras || !judet) {
    alert('Te rog completează Nume, Prenume, Telefon, Adresă, Oraș și Județ.'); 
    return false;
  }

  // calcul total
  const subtotal = cart.reduce((s,p)=> s + p.price * p.qty, 0);
  const livrare  = 17;
  const total    = subtotal + livrare;

  const itemsText = cart
    .map(p => `${p.name} x ${p.qty} @ ${p.price} RON = ${p.price*p.qty} RON`)
    .join('%0A');

  const header = `Comandă nouă – msahandmade.ro`;
  const addressBlock =
`Nume: ${nume} ${prenume}
Telefon: ${telefon}
Email: ${email || '-'}
Județ: ${judet}
Oraș: ${oras}
Cod poștal: ${codp || '-'}
Adresă: ${adresa}
Tip: ${tip === 'pj' ? 'Persoană juridică' : 'Persoană fizică'}
${tip==='pj' ? `Firmă: ${firma||'-'} | CUI: ${cui||'-'}` : ''}`;

  const bodyPlain =
`Bună!

Am primit o comandă prin site.

Produse:
${decodeURIComponent(itemsText)}

Subtotal: ${subtotal} RON
Livrare: 17 RON
TOTAL: ${total} RON

${mentiuni ? `Mentiuni: ${mentiuni}\n` : ''}
${addressBlock}

Mulțumesc!`;

  const to   = encodeURIComponent('msahandmade.contact@gmail.com'); // <- adresa ta
  const cc   = encodeURIComponent(email || '');
  const subj = encodeURIComponent(header);
  const body = encodeURIComponent(bodyPlain);

  // deschidem clientul de mail cu CC către client
  window.location.href = `mailto:${to}?subject=${subj}&cc=${cc}&body=${body}`;

  // UX: mesaj + golire coș
  setTimeout(() => {
    alert('Comandă trimisă cu succes! Vei primi confirmarea pe e-mail.');
    clearCart();
    // rămâi pe coș; sau redirecționează: window.location.href='index.html';
  }, 300);

  return false; // prevenim submit real
}

// expunem global pentru HTML
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.placeOrderViaEmail = placeOrderViaEmail;

// setează badge imediat
updateCartCount();
