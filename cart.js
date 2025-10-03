// ================== COȘ (localStorage) ==================
const CART_KEY = "msa_cart";

function readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function writeCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function clearCart() { writeCart([]); }
function cartCount() { return readCart().reduce((s, it) => s + it.qty, 0); }
function updateCartCountBadge() {
  const count = cartCount();
  ["cart-count", "cart-count-fab"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
}

// ================== OPERĂRI PE PRODUSE ==================
function addToCart(item) {
  const cart = readCart();
  const idx = cart.findIndex(x => x.id === item.id);
  if (idx >= 0) cart[idx].qty += 1; else cart.push({ ...item, qty: 1 });
  writeCart(cart); updateCartCountBadge();
  document.dispatchEvent(new CustomEvent("msa:added", { detail: item }));
}
function removeFromCart(id) { writeCart(readCart().filter(x => x.id !== id)); updateCartCountBadge(); }
function increaseQty(id) { const c=readCart(); const it=c.find(x=>x.id===id); if(it){it.qty++; writeCart(c); updateCartCountBadge();} }
function decreaseQty(id) { const c=readCart(); const it=c.find(x=>x.id===id); if(!it)return; it.qty--; writeCart(it.qty<=0?c.filter(x=>x.id!==id):c); updateCartCountBadge(); }
function setQty(id, qty) { const q=Math.max(0, Number(qty)||0); const c=readCart(); const it=c.find(x=>x.id===id); if(!it)return; if(q===0){writeCart(c.filter(x=>x.id!==id));} else {it.qty=q; writeCart(c);} updateCartCountBadge(); }

// ================== TOTALURI ==================
const SHIPPING_FEE = 17; // RON
function computeTotals(cart) {
  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = cart.length ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

// ================== DOAR pe butoane .add-to-cart ==================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-to-cart"); // <— schimbat!
  if (!btn) return;

  const { id, name, price, image } = btn.dataset;
  if (!id || !name || !price || !image) return; // protecție la butoane greșite

  const item = { id, name, price: Number(price), image };
  addToCart(item);

  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "Adăugat!";
  setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 900);
});

// init badge la încărcare
document.addEventListener("DOMContentLoaded", updateCartCountBadge);

// export
window.MSACart = {
  readCart, writeCart, clearCart,
  addToCart, removeFromCart, increaseQty, decreaseQty, setQty,
  updateCartCountBadge, computeTotals, SHIPPING_FEE
};
