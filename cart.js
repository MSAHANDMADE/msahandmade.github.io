// === MSA Handmade — Coș de cumpărături complet ===

// Date temporare salvate local
const STORAGE_KEY = 'msa_cart';
const ORDER_KEY = 'msa_last_order';

// ---- Funcții de lucru coș ----
function readCart() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch(e){ return []; }
}

function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  refreshCart();
}

function addToCart(item) {
  const cart = readCart();
  const found = cart.find(p => p.id === item.id);
  if (found) found.qty += 1;
  else cart.push({...item, qty:1});
  saveCart(cart);
}

function removeFromCart(id) {
  saveCart(readCart().filter(i => i.id !== id));
}

function clearCart() {
  localStorage.removeItem(STORAGE_KEY);
  refreshCart();
}

// ---- Calcul reduceri și total ----
function calcTotals(cart) {
  let subtotal = 0;
  cart.forEach(i => subtotal += (i.price || 0) * (i.qty || 1));

  let pct = 0;
  let shipping = 20; // livrare standard

  if (subtotal >= 400) pct = 20;
  else if (subtotal >= 300) { pct = 15; shipping = 0; }
  else if (subtotal >= 200) pct = 10;

  const discount = subtotal * pct / 100;
  const total = subtotal - discount + shipping;

  return { subtotal, pct, discount, shipping, total };
}

// ---- Randare coș în pagină ----
function refreshCart() {
  const list = readCart();
  const container = document.getElementById('cart-items');
  const totalsBox = document.getElementById('cart-totals');
  const countEl = document.getElementById('cart-count');

  if (countEl) countEl.textContent = list.reduce((s,i)=>s+(i.qty||1),0);

  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = '<p>Coșul este gol 🕯️</p>';
    if (totalsBox) totalsBox.innerHTML = '';
    return;
  }

  container.innerHTML = list.map(i => `
    <div class="cart-item">
      <img src="${i.image}" alt="${i.name}" />
      <div>
        <strong>${i.name}</strong><br>
        <small>${i.price} RON × ${i.qty}</small>
      </div>
      <button class="remove" data-id="${i.id}">✕</button>
    </div>
  `).join('');

  const t = calcTotals(list);
  if (totalsBox) {
    totalsBox.innerHTML = `
      <p>Subtotal: ${t.subtotal.toFixed(2)} RON</p>
      <p>Reducere: ${t.pct}% (-${t.discount.toFixed(2)} RON)</p>
      <p>Livrare: ${t.shipping === 0 ? 'Gratuită' : t.shipping + ' RON'}</p>
      <h3>Total: ${t.total.toFixed(2)} RON</h3>
    `;
  }

  // butoane stergere
  container.querySelectorAll('.remove').forEach(btn => {
    btn.onclick = () => removeFromCart(btn.dataset.id);
  });
}

// ---- Trimitere comandă ----
async function sendOrder(form) {
  const cart = readCart();
  if (cart.length === 0) return alert("Coșul este gol!");

  const client = Object.fromEntries(new FormData(form).entries());
  const totals = calcTotals(cart);

  const order = {
    id: 'MSA-' + Date.now(),
    ts: Date.now(),
    client, items: cart, totals
  };

  // salvează pentru proformă
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));

  try {
    // === trimite email prin EmailJS ===
    emailjs.init("SERVICE_KEY"); // 🔸 înlocuiește cu cheia ta publică EmailJS
    await emailjs.send("SERVICE_ID", "TEMPLATE_ID", {
      client_name: client.nume + " " + (client.prenume || ''),
      client_email: client.email,
      client_phone: client.telefon,
      total: totals.total.toFixed(2),
      message: JSON.stringify(order, null, 2)
    });
    alert("Comanda a fost trimisă cu succes! ✅");
    clearCart();
    window.location.href = "proforma.html";
  } catch (e) {
    console.error(e);
    alert("Eroare la trimiterea comenzii. Verifică integrarea EmailJS.");
  }
}

// ---- Legare formular ----
document.addEventListener("DOMContentLoaded", () => {
  refreshCart();
  const form = document.getElementById("order-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      sendOrder(form);
    });
  }
});

window.MSACart = { readCart, addToCart, removeFromCart, clearCart };
