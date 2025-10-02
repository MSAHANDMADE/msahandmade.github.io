// ================= MSA CART =================
const CART_KEY = 'msa_cart_v1';

// migrare cheie veche
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

// stocare
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

// acțiuni coș
function addToCart(item){
  const cart = getCart();
  const i = cart.findIndex(p => p.id === item.id);
  if (i >= 0) cart[i].qty += 1;
  else cart.push({...item, qty:1});
  saveCart(cart);
  alert("Adăugat în coș ✔");
}
function changeQty(id, delta){
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1, p.qty+delta)} : p);
  saveCart(cart);
  renderCart();
}
function removeItem(id){
  const cart = getCart().filter(p => p.id!==id);
  saveCart(cart);
  renderCart();
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  renderCart();
}

// randare coș
window.renderCart = function renderCart(){
  const root = document.getElementById('cart-root');
  if (!root) return;
  const cart = getCart();
  if (!cart.length){
    root.innerHTML = "<p>Coșul este gol.</p>";
    return;
  }
  const rows = cart.map(p=>`
    <div class="cart-row">
      <div>${p.name}</div>
      <div>${p.price} RON / buc</div>
      <div>
        <button onclick="changeQty(${p.id},-1)">-</button>
        ${p.qty}
        <button onclick="changeQty(${p.id},1)">+</button>
      </div>
      <div>${p.price*p.qty} RON</div>
      <div><button onclick="removeItem(${p.id})">Șterge</button></div>
    </div>
  `).join("");
  const subtotal = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const shipping = 17;
  const total = subtotal + shipping;
  root.innerHTML = rows + `
    <div class="cart-total">
      <p>Subtotal: ${subtotal} RON</p>
      <p>Livrare: ${shipping} RON</p>
      <p><strong>Total: ${total} RON</strong></p>
    </div>
  `;
}

// funcție de trimitere
function trimiteComanda(e){
  const form = e.target;
  const cart = getCart();
  if (!cart.length){
    e.preventDefault();
    alert("Coșul este gol.");
    return false;
  }

  // date
  const tip = form.tip.value;
  const nume = form.nume.value.trim();
  const prenume = form.prenume.value.trim();
  const email = form.email.value.trim();
  const telefon = form.telefon.value.trim();
  const judet = form.judet.value.trim();
  const oras = form.oras.value.trim();
  const codpostal = form.codpostal.value.trim();
  const adresa = form.adresa.value.trim();
  const firma = form.firma.value.trim();
  const cui = form.cui.value.trim();
  const mentiuni = form.mentiuni.value.trim() || "-";

  if (!nume || !prenume || !email || !telefon || !judet || !oras || !codpostal || !adresa){
    e.preventDefault();
    alert("Completează toate câmpurile obligatorii.");
    return false;
  }
  if (tip==="pj" && (!firma || !cui)){
    e.preventDefault();
    alert("Pentru Persoană juridică, completează Firmă și CUI.");
    return false;
  }

  // calcule
  const subtotal = cart.reduce((s,p)=>s+p.price*p.qty,0);
  const shipping = 17;
  const total = subtotal + shipping;
  const itemsText = cart.map(p => `${p.name} × ${p.qty} — ${p.price} RON`).join("\n");

  // mesaj
  const msg =
`Tip client: ${tip==="pj"?"Persoană juridică":"Persoană fizică"}
Nume: ${nume} ${prenume}
Email: ${email}
Telefon: ${telefon}
Adresă: ${adresa}, ${oras}, ${judet}, ${codpostal}
Firmă: ${firma||"-"}
CUI: ${cui||"-"}

Produse:
${itemsText}

Subtotal: ${subtotal} RON
Livrare: ${shipping} RON
TOTAL: ${total} RON

Mențiuni: ${mentiuni}`;

  document.getElementById("order_message").value = msg;

  // lăsăm formularul să se trimită normal la FormSubmit
}

// inițializare
document.addEventListener('DOMContentLoaded', ()=>{
  updateCartCount();
  if (document.getElementById('cart-root')) renderCart();
  const orderForm = document.querySelector('form.order-form');
  if (orderForm) orderForm.addEventListener('submit', trimiteComanda);
});
