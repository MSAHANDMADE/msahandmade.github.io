/* ===========================
   MSA Handmade — cart.js
   Gestionare coș + trimitere comandă + generare proformă
   =========================== */

// === Inițializare coș ===
const MSACart = {
  key: 'MSA_CART',
  get() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  },
  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.updateCartCountBadge();
  },
  add(item) {
    const items = this.get();
    const existing = items.find(i => i.id === item.id);
    if (existing) existing.qty += item.qty;
    else items.push(item);
    this.save(items);
  },
  remove(id) {
    const items = this.get().filter(i => i.id !== id);
    this.save(items);
  },
  clear() {
    localStorage.removeItem(this.key);
    this.updateCartCountBadge();
  },
  count() {
    return this.get().reduce((s, i) => s + i.qty, 0);
  },
  total() {
    return this.get().reduce((s, i) => s + i.price * i.qty, 0);
  },
  updateCartCountBadge() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = this.count();
  },
  getItems() {
    return this.get();
  }
};

// === Actualizare contor coș la pornire ===
document.addEventListener('DOMContentLoaded', () => {
  MSACart.updateCartCountBadge();
});


// === PAGINA COȘ ===
if (document.getElementById('cart-table')) {
  const tbody = document.querySelector('#cart-table tbody');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const form = document.getElementById('order-form');

  function renderCart() {
    const items = MSACart.get();
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#777;">Coșul este gol.</td></tr>`;
      subtotalEl.textContent = totalEl.textContent = '0.00 RON';
      return;
    }

    tbody.innerHTML = items.map(i => `
      <tr>
        <td><img src="${i.image}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:6px"></td>
        <td>${i.name}</td>
        <td style="text-align:center">
          <button class="qty-btn" data-id="${i.id}" data-act="-">−</button>
          <span>${i.qty}</span>
          <button class="qty-btn" data-id="${i.id}" data-act="+">+</button>
        </td>
        <td>${i.price.toFixed(2)} RON</td>
        <td>${(i.price * i.qty).toFixed(2)} RON</td>
      </tr>
    `).join('');

    const subtotal = MSACart.total();
    subtotalEl.textContent = subtotal.toFixed(2) + ' RON';
    totalEl.textContent = subtotal.toFixed(2) + ' RON';
  }

  renderCart();

  // Modificare cantitate
  tbody.addEventListener('click', e => {
    if (!e.target.classList.contains('qty-btn')) return;
    const id = e.target.dataset.id;
    const act = e.target.dataset.act;
    const items = MSACart.get();
    const item = items.find(x => x.id === id);
    if (!item) return;
    if (act === '+' && item.qty < 99) item.qty++;
    if (act === '-' && item.qty > 1) item.qty--;
    MSACart.save(items);
    renderCart();
  });

  // === TRIMITERE COMANDĂ ===
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const items = MSACart.get();
    if (!items.length) return alert('Coșul este gol.');

    const fd = new FormData(form);
    const clientData = Object.fromEntries(fd.entries());

    const subtotal = MSACart.total();
    const reducere = 0;
    const livrare = subtotal >= 300 ? 0 : 20;
    const totalFinal = subtotal - reducere + livrare;

    // === Pregătim parametrii pentru EmailJS ===
    const paramsClient = {
      to_name: clientData.nume || clientData.denumire,
      to_email: clientData.email,
      from_name: 'MSA Handmade',
      message: items.map(i => `${i.name} (x${i.qty}) — ${i.price * i.qty} RON`).join('\n'),
      total: totalFinal.toFixed(2) + ' RON',
      livrare: livrare ? livrare + ' RON' : 'Gratuit',
      date: new Date().toLocaleDateString('ro-RO'),
    };

    // === Trimitere prin EmailJS ===
    emailjs.send("service_h7ft1aj", "template_1vul8hd", paramsClient, "k7BHpST-4ADmVYpB3")
      .then(() => {
        // ✅ Salvăm datele pentru proformă
        const orderData = {
          orderId: Date.now(),
          client: clientData,
          items: items,
          totaluri: {
            subtotal: subtotal,
            reducere: reducere,
            livrare: livrare,
            total: totalFinal
          }
        };
        localStorage.setItem('MSA_LAST_ORDER', JSON.stringify(orderData));

        // ✅ Deschidem proforma automat
        window.open('proforma.html', '_blank');

        alert("Comanda a fost trimisă cu succes! Proforma a fost generată.");
        MSACart.clear();
        renderCart();
      })
      .catch(() => alert('Eroare la trimiterea comenzii. Verifică conexiunea.'));
  });
}
