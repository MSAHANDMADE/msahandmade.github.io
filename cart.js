// =============== MSA CART – versiunea v3 (auto-heal) ===============
const CART_KEY = 'msa_cart_v1';

// Migrare automată din chei vechi (ex: "cart")
(function migrateOldKeys(){
  try {
    const old = localStorage.getItem('cart');
    const current = localStorage.getItem(CART_KEY);
    if (old && !current) {
      localStorage.setItem(CART_KEY, old);
      localStorage.removeItem('cart');
    }
  } catch(e){}
})();

// ---- Utilitare stocare ----
function getCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// ---- Acțiuni coș ----
function addToCart(item){
  const cart = getCart();
  const at = cart.findIndex(p => p.id === item.id);
  if (at >= 0) { cart[at].qty = (cart[at].qty||1) + 1; }
  else { cart.push({...item, qty: 1}); }
  saveCart(cart);
  if (window.msaToast) msaToast('Adăugat în coș ✔︎');
}
function changeQty(id, delta){
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1, (p.qty||1)+delta)} : p);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function removeItem(id){
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function clearCart(){
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

// ---- Trimitere comandă prin FormSubmit (plata la livrare) ----
function trimiteComanda(e){
  e.preventDefault();
  const form = e.target;
  const cart = getCart();

  if (!cart.length) { alert('Coșul este gol.'); return false; }

  const nume = form.nume.value.trim();
  const prenume = form.prenume.value.trim();
  const email = form.email.value.trim();
  const telefon = form.telefon.value.trim();
  const judet = form.judet.value.trim();
  const oras = form.oras.value.trim();
  const codpostal = form.codpostal.value.trim();
  const adresa = form.adresa.value.trim();
  const tip = form.tip.value; // pf / pj
  const firma = form.firma?.value.trim() || '';
  const cui = form.cui?.value.trim() || '';
  const mentiuni = form.mentiuni.value.trim();

  if (!nume || !prenume || !email || !telefon || !judet || !oras || !codpostal || !adresa) {
    alert('Te rog completează toate câmpurile obligatorii.'); return false;
  }

  const subtotal = cart.reduce((s,p)=>s+p.price*(p.qty||1),0);
  const shipping = 17;
  const total = subtotal + shipping;

  const itemsText = cart.map(p => `${p.name} × ${p.qty} – ${p.price} RON`).join('%0A');

  // Conținut pentru FormSubmit
  const subject = encodeURIComponent('Comandă nouă – msahandmade.ro');
  const body = encodeURIComponent(
`Tip client: ${tip==='pj'?'Persoană juridică':'Persoană fizică'}
${tip==='pj' ? `Firmă: ${firma}\nCUI: ${cui}\n` : ''}Nume: ${nume} ${prenume}
Email: ${email}
Telefon: ${telefon}
Adresă: ${adresa}, ${oras}, ${judet}, ${codpostal}

Produse:
${decodeURIComponent(itemsText)}

Subtotal: ${subtotal} RON
Livrare: ${shipping} RON
TOTAL: ${total} RON

Mențiuni: ${mentiuni || '-'}
`);

  // Trimitem către FormSubmit (schimbă adresa dacă e nevoie)
  const action = form.getAttribute('action');
  const url = `${action}?subject=${subject}&message=${body}`;

  // trimitem „invizibil”
  fetch(url, { method: 'POST', mode: 'no-cors' })
    .catch(()=>{}) // FormSubmit acceptă și fără CORS
    .finally(()=> {
      // curățăm coșul și mergem la pagina de mulțumire
      clearCart();
      window.location.href = 'multumesc.html';
    });

  return false;
}

// Inițializare pe fiecare pagină
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();

  // Atașează handlerul de submit dacă există formularul
  const orderForm = document.querySelector('form.order-form');
  if (orderForm) orderForm.addEventListener('submit', trimiteComanda);

  // Randare coș dacă suntem pe cos.html
  if (document.getElementById('cart-root')) renderCart();
});
