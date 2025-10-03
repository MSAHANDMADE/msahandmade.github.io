/* === Cart helper === */
const STORAGE_KEY = 'cart';

function loadCart(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch{ return []; }
}
function saveCart(cart){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
function cartCount(){
  const cart = loadCart();
  return cart.reduce((s,i)=>s+i.qty,0);
}
function updateCartBadge(){
  const el = document.getElementById('cart-count');
  if(!el) return;
  el.textContent = cartCount();
}

function addToCart(item){ // item: {id,name,price,image}
  const cart = loadCart();
  const i = cart.findIndex(p => p.id === item.id);
  if(i>-1){ cart[i].qty += 1; }
  else{ cart.push({...item, qty:1}); }
  saveCart(cart);
  updateCartBadge();
  showToast('Produsul a fost adăugat în coș ✅');
}

function removeFromCart(id){
  const cart = loadCart().filter(p=>p.id!==id);
  saveCart(cart); updateCartBadge();
}

function changeQty(id, delta){
  const cart = loadCart();
  const it = cart.find(p=>p.id===id);
  if(!it) return;
  it.qty += delta;
  if(it.qty<=0){ return removeFromCart(id); }
  saveCart(cart); updateCartBadge();
}

function formatRON(n){ return new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON',minimumFractionDigits:2}).format(n); }

/* toast mic */
function showToast(msg){
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(()=>{ t.classList.add('show'); });
  setTimeout(()=> t.classList.remove('show'), 1800);
}

/* init badge la încărcare */
document.addEventListener('DOMContentLoaded', updateCartBadge);

/* === Hook generic pentru butoane .add-to-cart ===
   Orice buton cu .add-to-cart și data-id, data-name, data-price, data-image
   va funcționa automat. */
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.add-to-cart');
  if(!btn) return;
  const id = btn.dataset.id;
  const name = btn.dataset.name;
  const price = parseFloat(btn.dataset.price);
  const image = btn.dataset.image || '';
  if(!id || !name || isNaN(price)){ return; }
  addToCart({id,name,price,image});
});

/* === Render coș pe cos.html, dacă există #cart-table === */
document.addEventListener('DOMContentLoaded', ()=>{
  const table = document.getElementById('cart-table');
  const totalEl = document.getElementById('cart-total');
  if(!table || !totalEl) return;

  function render(){
    const cart = loadCart();
    table.innerHTML = '';
    let subtotal = 0;
    if(cart.length===0){
      table.innerHTML = `<tr><td colspan="5" class="muted">Coșul este gol.</td></tr>`;
      totalEl.textContent = formatRON(0);
      return;
    }
    cart.forEach(p=>{
      const line = p.price * p.qty; subtotal += line;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="width:60px">${p.image ? `<img src="${p.image}" style="height:44px;border-radius:8px">` : ''}</td>
        <td>${p.name}</td>
        <td>${formatRON(p.price)}</td>
        <td>
          <button class="btn-qty" data-act="dec" data-id="${p.id}">-</button>
          <strong style="padding:0 8px">${p.qty}</strong>
          <button class="btn-qty" data-act="inc" data-id="${p.id}">+</button>
        </td>
        <td>${formatRON(line)}</td>
      `;
      table.appendChild(tr);
    });
    totalEl.textContent = formatRON(subtotal);
  }
  render();

  table.addEventListener('click',(e)=>{
    const b = e.target.closest('.btn-qty'); if(!b) return;
    const id = b.dataset.id; const act = b.dataset.act;
    changeQty(id, act==='inc'? +1 : -1);
    // re-render
    const event = new Event('render-cart'); document.dispatchEvent(event);
  });

  document.addEventListener('render-cart', render);
});
