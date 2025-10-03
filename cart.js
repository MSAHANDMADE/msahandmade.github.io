<script>
// ===== COȘ (localStorage) =====
const CART_KEY = 'msa_cart_v1';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  const el = document.getElementById('cart-count');
  if(el) el.textContent = count;
}
function addToCart(id, name, price, qty=1){
  const cart = getCart();
  const i = cart.findIndex(p=>p.id===id);
  if(i>-1) cart[i].qty += qty;
  else cart.push({id, name, price:Number(price), qty:Number(qty)});
  saveCart(cart);
  alert('Adăugat în coș!');
}
function removeFromCart(id){
  const cart = getCart().filter(p=>p.id!==id);
  saveCart(cart); renderCart();
}
function changeQty(id, delta){
  const cart = getCart();
  const it = cart.find(p=>p.id===id);
  if(!it) return;
  it.qty = Math.max(1, it.qty + delta);
  saveCart(cart); renderCart();
}
function clearCart(){ localStorage.removeItem(CART_KEY); updateCartCount(); }

// ===== RENDER pe cos.html =====
function renderCart(){
  const root = document.getElementById('cart-root');
  if(!root) return;

  const cart = getCart();
  if(cart.length===0){
    root.innerHTML = '<p>Coșul tău este gol.</p>';
    ['subtotal','livrare','total'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='0'; });
    const os = document.getElementById('order_summary'); if(os) os.value='';
    return;
  }

  let html = '<table class="cart-table"><thead><tr><th>Produs</th><th>Preț</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead><tbody>';
  let subtotal = 0;
  cart.forEach(p=>{
    const line = p.price * p.qty;
    subtotal += line;
    html += `
      <tr>
        <td>${p.name}</td>
        <td>${p.price.toFixed(2)} RON</td>
        <td>
          <button type="button" onclick="changeQty('${p.id}',-1)">-</button>
          <span style="display:inline-block;min-width:32px;text-align:center">${p.qty}</span>
          <button type="button" onclick="changeQty('${p.id}',1)">+</button>
        </td>
        <td>${line.toFixed(2)} RON</td>
        <td><button type="button" onclick="removeFromCart('${p.id}')">Șterge</button></td>
      </tr>`;
  });
  html += '</tbody></table>';
  root.innerHTML = html;

  const livrare = 17;
  const total = subtotal + livrare;
  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('livrare').textContent  = livrare.toFixed(2);
  document.getElementById('total').textContent    = total.toFixed(2);

  let lines = ['Produse:'];
  cart.forEach(p=>lines.push(`• ${p.name} × ${p.qty} — ${(p.price*p.qty).toFixed(2)} RON`));
  lines.push('');
  lines.push(`Subtotal: ${subtotal.toFixed(2)} RON`);
  lines.push(`Livrare: ${livrare.toFixed(2)} RON`);
  lines.push(`TOTAL: ${total.toFixed(2)} RON`);
  const os = document.getElementById('order_summary');
  if(os) os.value = lines.join('\n');
}

document.addEventListener('DOMContentLoaded', updateCartCount);
</script>
