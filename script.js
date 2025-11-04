<!-- include asta în toate paginile, înainte de </body> -->
<script>
// ========== CONFIG ==========
const LS_KEY = 'MSA_CART';

// ========== UTILS ==========
const MSACart = {
  // citește coșul
  getCart() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch(_) { return []; }
  },
  // salvează coșul
  setCart(items) {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
    MSACart.updateCartCountBadge();
    window.dispatchEvent(new StorageEvent('storage', {key: LS_KEY, newValue: localStorage.getItem(LS_KEY)}));
  },
  // adaugă produs (fără dubluri – mărește cantitatea)
  add(item) {
    const cart = MSACart.getCart();
    const idx = cart.findIndex(p => String(p.id) === String(item.id));
    if (idx > -1) {
      cart[idx].qty += Number(item.qty || 1);
    } else {
      cart.push({ id:item.id, name:item.name, price:Number(item.price), image:item.image||'', qty:Number(item.qty||1) });
    }
    MSACart.setCart(cart);
  },
  // schimbă cantitatea
  setQty(id, qty) {
    const cart = MSACart.getCart();
    const it = cart.find(p => String(p.id)===String(id));
    if (!it) return;
    it.qty = Math.max(1, Number(qty||1));
    MSACart.setCart(cart);
  },
  changeQty(id, delta) {
    const cart = MSACart.getCart();
    const it = cart.find(p => String(p.id)===String(id));
    if (!it) return;
    it.qty = Math.max(1, it.qty + Number(delta));
    MSACart.setCart(cart);
  },
  remove(id) {
    const next = MSACart.getCart().filter(p => String(p.id)!==String(id));
    MSACart.setCart(next);
  },
  clear() { localStorage.removeItem(LS_KEY); MSACart.updateCartCountBadge(); },

  // badge coș
  updateCartCountBadge() {
    const items = MSACart.getCart();
    const count = items.reduce((s,it)=>s+Number(it.qty||0),0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
  }
};

// ========== HOOKS ==========
document.addEventListener('DOMContentLoaded', () => {
  // pornește badge-ul
  MSACart.updateCartCountBadge();

  // butoane “Adaugă în coș” (nu modificăm pagina ta de produse – doar citim data-* dacă există)
  document.querySelectorAll('[data-add-to-cart], .add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset;
      if (!d.id || !d.name || !d.price) {
        alert('Produsul nu are atribute data-* suficiente (id, name, price).');
        return;
      }
      MSACart.add({
        id: d.id, name: d.name, price: d.price, image: d.image||'', qty: d.qty||1
      });
      // feedback
      btn.classList.add('active');
      setTimeout(()=>btn.classList.remove('active'), 500);
    });
  });
});

// dacă se schimbă localStorage din alt tab, actualizează badge
window.addEventListener('storage', (e)=>{
  if (e.key === LS_KEY) MSACart.updateCartCountBadge();
});

// expune pentru cart.js
window.MSACart = MSACart;
</script>
