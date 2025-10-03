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
  const el = document.getElementById("cart-count");
  if (el) el.textContent = cartCount();
}

// ================== OPERĂRI PE PRODUSE ==================
function addToCart(item) {
  const cart = readCart();
  const idx = cart.findIndex(x => x.id === item.id);
  if (idx >= 0) cart[idx].qty += 1; else cart.push({ ...item, qty: 1 });
  writeCart(cart); updateCartCountBadge();
}
function removeFromCart(id) {
  writeCart(readCart().filter(x => x.id !== id));
  updateCartCountBadge();
}
function increaseQty(id) {
  const cart = readCart();
  const it = cart.find(x => x.id === id);
  if (it) { it.qty += 1; writeCart(cart); updateCartCountBadge(); }
}
function decreaseQty(id) {
  const cart = readCart();
  const it = cart.find(x => x.id === id);
  if (!it) return;
  it.qty -= 1;
  if (it.qty <= 0) {
    const filtered = cart.filter(x => x.id !== id);
    writeCart(filtered);
  } else {
    writeCart(cart);
  }
  updateCartCountBadge();
}
function setQty(id, qty) {
  const q = Math.max(0, Number(qty) || 0);
  const cart = readCart();
  const it = cart.find(x => x.id === id);
  if (!it) return;
  if (q === 0) {
    writeCart(cart.filter(x => x.id !== id));
  } else {
    it.qty = q;
    writeCart(cart);
  }
  updateCartCountBadge();
}

// ================== TOTALURI ==================
const SHIPPING_FEE = 17; // RON
function computeTotals(cart) {
  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = cart.length ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

// ================== BUTOANE "Adaugă în coș" (pe paginile listă/detaliu) ==================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-btn");
  if (!btn) return;
  const item = {
    id: btn.dataset.id,
    name: btn.dataset.name,
    price: Number(btn.dataset.price),
    image: btn.dataset.image
  };
  addToCart(item);
  btn.textContent = "Adăugat!";
  setTimeout(() => (btn.textContent = "Adaugă în coș"), 900);
});

// init badge la încărcare
document.addEventListener("DOMContentLoaded", updateCartCountBadge);

// export pentru cos.html
window.MSACart = {
  readCart, writeCart, clearCart,
  addToCart, removeFromCart, increaseQty, decreaseQty, setQty,
  updateCartCountBadge, computeTotals, SHIPPING_FEE
};
