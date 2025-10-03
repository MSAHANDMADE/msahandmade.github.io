// ============= MSA CART – FINAL =============
const CART_KEY = 'msa_cart_v1';
const SHIPPING_FLAT = 17; // livrare fixă

// --- migrare din chei vechi (siguranță) ---
(function migrate(){
  try{
    const old = localStorage.getItem('cart');
    const cur = localStorage.getItem(CART_KEY);
    if (old && !cur) {
      localStorage.setItem(CART_KEY, old);
      localStorage.removeItem('cart');
    }
  }catch(e){}
})();

// --- utilitare stocare ---
function getCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((s,i)=> s + (i.qty||0), 0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// --- acțiuni coș ---
function addToCart(item){
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty||0) + 1;
  else cart.push({...item, qty:1});
  saveCart(cart);
  // feedback opțional: alert('Adăugat în coș ✔');
}
function changeQty(id, delta){
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1,(p.qty||1)+delta)} : p);
  saveCart(cart); renderCart();
}
function removeItem(id){
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart); renderCart();
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
  updateCartCount(); renderCart();
}

// --- randare coș în cos.html ---
function money(v){ return v.toFixed(0) + ' RON'; }

function renderCart(){
  const root = document.getElementById('cart-root');
  if (!root) return;

  const cart = getCart();
  if (!cart.length){
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
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <span>${p.qty||1}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price*(p.qty||1))}</div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s,p)=> s + p.price*(p.qty||1), 0);
  const total = subtotal + SHIPPING_FLAT;

  root.innerHTML = `
    <div class="cart-list">${rows}</div>
    <div id="totals" class="cart-total">
      <div><strong>Subtotal: ${money(subtotal)}</strong></div>
      <div>Livrare: <strong>${money(SHIPPING_FLAT)}</strong></div>
      <div>Total: <strong>${money(total)}</strong></div>
    </div>
  `;
}

// --- pregătește mesajul & câmpurile pentru FormSubmit și lasă submit-ul nativ ---
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  if (document.getElementById('cart-root')) renderCart();

  const form = document.getElementById('order-form');
  if (!form) return;

  form.addEventListener('submit', () => {
    const cart = getCart();
    if (!cart.length){
      alert('Coșul este gol.');
      return;
    }

    // date client
    const nume      = form.nume.value.trim();
    const prenume   = form.prenume.value.trim();
    const email     = form.email.value.trim();
    const telefon   = form.telefon.value.trim();
    const judet     = form.judet.value.trim();
    const oras      = form.oras.value.trim();
    const codpostal = form.codpostal.value.trim();
    const adresa    = form.adresa.value.trim();
    const tip       = form.tip.value; // pf / pj
    const firma     = (form.firma?.value.trim() || '');
    const cui       = (form.cui?.value.trim() || '');
    const mentiuni  = (form.mentiuni?.value.trim() || '-');

    // totaluri
    const subtotal = cart.reduce((s,p)=> s + p.price*(p.qty||1), 0);
    const total    = subtotal + SHIPPING_FLAT;

    // listă produse (pentru corpul mesajului)
    const itemsText = cart.map(p => `• ${p.name} × ${p.qty||1} — ${p.price} RON`).join('\n');

    // personalizează subiectul
    const subj = form.querySelector('input[name="_subject"]');
    if (subj) subj.value = `Comandă nouă – ${nume} ${prenume} (${tip.toUpperCase()})`;

    // setează CC către client + reply-to
    const cc = document.getElementById('order_cc');
    if (cc) cc.value = email;
    const rt = document.getElementById('order_replyto');
    if (rt) rt.value = email;

    // compune mesajul final și pune-l în <textarea name="message">
    const body =
`Tip client: ${tip==='pj' ? 'Persoană juridică' : 'Persoană fizică'}
${tip==='pj' ? `Firmă: ${firma}\nCUI: ${cui}\n` : ''}Nume: ${nume} ${prenume}
Email: ${email}
Telefon: ${telefon}
Adresă: ${adresa}, ${oras}, ${judet}, ${codpostal}

Produse:
${itemsText}

Subtotal: ${subtotal} RON
Livrare: ${SHIPPING_FLAT} RON
TOTAL: ${total} RON

Mențiuni: ${mentiuni}`;

    const msg = document.getElementById('order_message');
    if (msg) msg.value = body;

    // nu facem preventDefault – lăsăm formularul să trimită nativ la FormSubmit
    // redirectul la multumesc.html se face automat prin _next
  });
});

// expunem funcțiile folosite în HTML
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.renderCart = renderCart;
