// cart.js

function getCart(){
  return JSON.parse(localStorage.getItem('cart') || '[]');
}
function saveCart(cart){
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}
function clearCart(){
  localStorage.removeItem('cart');
  updateCartCount();
  renderCart();
}
function updateCartCount(){
  const cart = getCart();
  document.getElementById('cart-count').textContent =
    cart.reduce((s,p)=>s+(p.qty||1), 0);
}

// randare produse în coș
function renderCart(){
  const root = document.getElementById('cart-root');
  const cart = getCart();

  if (!root) return;

  if (!cart.length){
    root.innerHTML = "<p>Coșul este gol.</p>";
    return;
  }

  let subtotal = 0;
  root.innerHTML = cart.map((p,i)=>{
    subtotal += p.price * (p.qty||1);
    return `
      <div class="cart-item">
        <span>${p.name}</span>
        <span>${p.price} RON / buc</span>
        <span>x ${p.qty}</span>
        <button onclick="removeFromCart(${i})">Șterge</button>
      </div>`;
  }).join("");

  const shipping = 17;
  const total = subtotal + shipping;
  root.innerHTML += `
    <div class="cart-summary">
      <p>Subtotal: ${subtotal} RON</p>
      <p>Livrare: ${shipping} RON</p>
      <p><strong>Total: ${total} RON</strong></p>
    </div>`;
}
function removeFromCart(i){
  const cart = getCart();
  cart.splice(i,1);
  saveCart(cart);
  renderCart();
}

// trimite comanda
function trimiteComanda(e){
  e.preventDefault();
  const form = e.target;
  const cart = getCart();

  if (!cart.length){
    alert('Coșul este gol.');
    return false;
  }

  const tip       = form.tip.value;
  const nume      = form.nume.value.trim();
  const prenume   = form.prenume.value.trim();
  const email     = form.email.value.trim();
  const telefon   = form.telefon.value.trim();
  const judet     = form.judet.value.trim();
  const oras      = form.oras.value.trim();
  const codpostal = form.codpostal.value.trim();
  const adresa    = form.adresa.value.trim();
  const firma     = (form.firma?.value || '').trim();
  const cui       = (form.cui?.value   || '').trim();
  const mentiuni  = (form.mentiuni?.value || '').trim();

  const subtotal = cart.reduce((s,p)=>s+p.price*(p.qty||1),0);
  const shipping = 17;
  const total    = subtotal+shipping;

  const itemsText = cart.map(p=>`• ${p.name} × ${p.qty} — ${p.price} RON`).join('\n');

  // mesaj pentru admin
  const adminMsg =
`Tip client: ${tip==='pj'?'Persoană juridică':'Persoană fizică'}
Nume: ${nume} ${prenume}
Email: ${email}
Telefon: ${telefon}
Adresă: ${adresa}, ${oras}, ${judet}, ${codpostal}
${tip==='pj'?`Firmă: ${firma}\nCUI: ${cui}\n`:''}

Produse:
${itemsText}

Subtotal: ${subtotal} RON
Livrare: ${shipping} RON
TOTAL: ${total} RON

Mențiuni: ${mentiuni||'-'}`;

  document.getElementById('order_message').value = adminMsg;

  // mesaj pentru client (auto-reply frumos)
  const clientMsg =
`Comandă confirmată – M.S.A Handmade Decor

Îți mulțumim pentru comandă! A fost înregistrată cu succes.
Procesăm comenzile în 1–3 zile lucrătoare, apoi livrăm prin curier.

Detaliile comenzii tale:
Nume: ${nume} ${prenume}
Telefon: ${telefon}
Adresă: ${adresa}, ${oras}, ${judet}, ${codpostal}

Produse:
${itemsText}

Subtotal: ${subtotal} RON
Livrare: ${shipping} RON
TOTAL: ${total} RON

Dacă vrei să schimbi culoarea, varianta sau intervalul de livrare,
răspunde direct la acest e-mail.

Cu drag,
M.S.A Handmade Decor`;

  document.getElementById('fs_autoresponse').value = clientMsg;
  document.getElementById('fs_replyto').value = email;

  // trimitem prin FormSubmit
  const action = form.getAttribute('action');
  fetch(action, {method:'POST', mode:'no-cors'}).finally(()=>{
    clearCart();
    window.location.href = 'multumesc.html';
  });

  return false;
}

document.addEventListener('DOMContentLoaded',()=>{
  updateCartCount();
  renderCart();
  const orderForm = document.querySelector('#order-form');
  if(orderForm) orderForm.addEventListener('submit', trimiteComanda);
});
