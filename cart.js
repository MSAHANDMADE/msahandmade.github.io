// ---------------- MSA CART ----------------
const CART_KEY = 'msa_cart_v1';
const SHIPPING = 17; // lei

function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch{ return []; } }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(el=>el.textContent = count);
}

// Adaugă un produs (apelezi din Produse)
function addToCart(item){
  const cart = getCart();
  const i = cart.findIndex(p=>p.id===item.id);
  if(i>=0) cart[i].qty = (cart[i].qty||1) + 1;
  else cart.push({...item, qty: 1});
  saveCart(cart);
  // feedback vizual pe butonul apăsat
  if (event && event.currentTarget){
    const btn = event.currentTarget;
    btn.classList.add('ok'); btn.textContent = 'Adăugat ✓';
    setTimeout(()=>{ btn.classList.remove('ok'); btn.textContent = 'Adaugă în coș'; }, 900);
  }
  if (window.renderCart) renderCart();
}

// modifică cantitatea
function changeQty(id, delta){
  const cart = getCart().map(p => p.id===id ? {...p, qty: Math.max(1,(p.qty||1)+delta)} : p);
  saveCart(cart);
  if (window.renderCart) renderCart();
}

// șterge un produs
function removeItem(id){
  const cart = getCart().filter(p=>p.id!==id);
  saveCart(cart);
  if (window.renderCart) renderCart();
}

// golește coșul
function clearCart(){
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  if (window.renderCart) renderCart();
}

// redare pe pagina cos.html
window.renderCart = function renderCart(){
  const root = document.getElementById('cart-root');
  const totalsBox = document.getElementById('totals');
  const cart = getCart();

  if (!cart.length){
    root.innerHTML = '<p>Coșul este gol.</p>';
    totalsBox.innerHTML = '';
    return;
  }

  const rows = cart.map(p=>`
    <div class="cart-row">
      <div class="cart-title" style="flex:1 1 auto">${p.name}</div>
      <div>${p.price} RON / buc</div>
      <div>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <strong style="min-width:24px;display:inline-block;text-align:center">${p.qty||1}</strong>
        <button type="button" class="qty-btn" onclick="changeQty(${p.id},+1)">+</button>
      </div>
      <div style="width:90px;text-align:right"><strong>${(p.price*(p.qty||1)).toFixed(0)} RON</strong></div>
      <button type="button" class="remove-btn" onclick="removeItem(${p.id})">Șterge</button>
    </div>
  `).join('');

  root.innerHTML = rows;

  const subtotal = cart.reduce((s,p)=>s + p.price*(p.qty||1), 0);
  const total = subtotal + SHIPPING;

  totalsBox.innerHTML = `
    <div><span>Subtotal</span><strong>${subtotal.toFixed(0)} RON</strong></div>
    <div><span>Livrare</span><strong>${SHIPPING.toFixed(0)} RON</strong></div>
    <div style="border-top:1px solid #eee;padding-top:8px"><span>Total</span><strong>${total.toFixed(0)} RON</strong></div>
  `;
};

// Trimite comanda prin FormSubmit (e-mail către tine + auto-răspuns către client)
function placeOrderViaEmail(form){
  const cart = getCart();
  if (!cart.length){ alert('Coșul este gol.'); return; }

  // validare simplă
  const f = new FormData(form);
  const required = ['nume','prenume','telefon','email','judet','oras','codpostal','adresa'];
  for (const k of required){ if (!String(f.get(k)||'').trim()){ alert('Te rog completează toate câmpurile obligatorii.'); return; } }

  // compunere text produse
  const itemsText = cart.map(p=> `${p.name} × ${p.qty||1} = ${(p.price*(p.qty||1)).toFixed(0)} RON`).join('\n');
  const subtotal = cart.reduce((s,p)=>s + p.price*(p.qty||1), 0);
  const total = subtotal + SHIPPING;

  // client PF / PJ
  const tip = document.querySelector('input[name="tip"]:checked')?.value || 'pf';
  const firma = f.get('firma') || '';
  const cui = f.get('cui') || '';

  // completez form-ul ascuns pentru FormSubmit
  const hidden = document.getElementById('hidden-mail-form');
  hidden.querySelector('input[name="_replyto"]').value = f.get('email');

  const dateClient =
`Tip: ${tip==='pj'?'Persoană juridică':'Persoană fizică'}
Nume: ${f.get('nume')} ${f.get('prenume')}
Telefon: ${f.get('telefon')}
E-mail: ${f.get('email')}
Județ: ${f.get('judet')} | Oraș: ${f.get('oras')}
Cod poștal: ${f.get('codpostal')}
Adresă: ${f.get('adresa')}
${tip==='pj' ? `Firmă: ${firma}\nCUI: ${cui}\n` : '' }
Mențiuni: ${f.get('mesaj')||'-'}
`;

  hidden.querySelector('input[name="Date client"]').value = dateClient;

  const comandaText =
`PRODUSE:
${itemsText}

Subtotal: ${subtotal.toFixed(0)} RON
Livrare: ${SHIPPING.toFixed(0)} RON
TOTAL: ${total.toFixed(0)} RON`;
  hidden.querySelector('input[name="Comandă"]').value = comandaText;

  // trimit
  hidden.submit();

  // golesc coșul local + mesaj
  clearCart();
  alert('Comanda a fost trimisă! Vei primi un e-mail de confirmare.');
}
