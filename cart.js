// ============= MSA CART – v3 =============
const CART_KEY = 'msa_cart_v1';
const SHIPPING_FLAT = 17; // livrare fixă

// migrare automată din vechiul "cart"
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

// ==== utilitare stocare ====
function getCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+(i.qty||0),0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
}

// ==== acțiuni ====
function addToCart(item){
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty = (cart[i].qty||0) + 1;
  else cart.push({...item, qty:1});
  saveCart(cart);
  if (window.msaToast) window.msaToast('Adăugat în coș ✔');
}
window.addToCart = addToCart;

function changeQty(id, delta){
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1,(p.qty||1)+delta)} : p);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
function removeItem(id){
  const cart = getCart().filter(p => p.id !== id);
  saveCart(cart);
  if (window.renderCart) window.renderCart();
}
window.changeQty = changeQty;
window.removeItem = removeItem;

function clearCart(){
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  if (window.renderCart) window.renderCart();
}
window.clearCart = clearCart;

// ==== randare coș (pentru cos.html) ====
window.renderCart = function renderCart(){
  const root = document.getElementById('cart-root');
  if (!root) return;

  const cart = getCart();
  if (!cart.length){
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
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <span>${p.qty||1}</span>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div class="cart-subtotal">${money(p.price*(p.qty||1))}</div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((s,p)=> s + p.price*(p.qty||1), 0);
  const shipping = SHIPPING_FLAT;
  const total = subtotal + shipping;

  root.innerHTML = `
    <div class="cart-list">${rows}</div>
    <div id="totals" class="cart-total">
      <div><strong>Subtotal: ${money(subtotal)}</strong></div>
      <div>Livrare: <strong>${money(shipping)}</strong></div>
      <div>Total: <strong>${money(total)}</strong></div>
    </div>
  `;
};

function money(v){ return v.toFixed(0) + ' RON'; }

// ==== compunerea mesajului pentru FormSubmit ====
// IMPORTANT: nu anulăm submit-ul! lăsăm browserul să trimită normal către FormSubmit,
// doar setăm dinamic subiectul și textarea cu rezumatul comenzii.
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  if (document.getElementById('cart-root')) renderCart();

  const form = document.getElementById('order-form');
  if (!form) return;

  form.addEventListener('submit', () => {
    const cart = getCart();
    // dacă e gol, lasă HTML5 "required" să blocheze oricum,
    // dar afișăm și un alert prietenos
    if (!cart.length){
      alert('Coșul este gol.');
      return;
    }

    const nume = form.nume.value.trim();
    const prenume = form.prenume.value.trim();
    const email = form.email.value.trim();
    const telefon = form.telefon.value.trim();
    const judet = form.judet.value.trim();
    const oras = form.oras.value.trim();
    const codpostal = form.codpostal.value.trim();
    const adresa = form.adresa.value.trim();
    const tip = form.tip.value; // pf / pj
    const firma = (form.firma?.value.trim()) || '';
    const cui = (form.cui?.value.trim()) || '';
    const mentiuni = form.mentiuni.value.trim();

    const subtotal = cart.reduce((s,p)=> s + p.price*(p.qty||1), 0);
    const shipping = SHIPPING_FLAT;
    const total = subtotal + shipping;

    const itemsText = cart
      .map(p => `${p.name} × ${p.qty} — ${p.price} RON`)
      .join('%0A'); // \n URL-encoded

    // subiect personalizat
    form.querySelector('input[name="_subject"]').value =
      `Comandă nouă – ${nume} ${prenume} (${tip.toUpperCase()})`;

    // mesajul tabelar (va apărea frumos în e-mail datorită _template=table)
    const body =
`Tip client: ${tip==='pj' ? 'Persoană juridică' : 'Persoană fizică'}
Nume: ${nume} ${prenume}
Email: ${email}
Telefon: ${telefon}
Adresă: ${adresa}, ${oraș=oras}, ${județ=judet}, ${codpostal}

Produse:
${decodeURIComponent(itemsText)}

Subtotal: ${subtotal} RON
Livrare: ${shipping} RON
TOTAL: ${total} RON

${mentiuni ? ('Mențiuni: ' + mentiuni) : ''}`;

    document.getElementById('order_message').value = body;
    // nu facem preventDefault – lăsăm submit-ul normal să meargă la FormSubmit,
    // iar redirect-ul către multumesc.html se face prin _next.
  });
});
