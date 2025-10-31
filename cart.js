/* cart.js — MSA Handmade (drop-in) */
(function () {
  const STORE_KEY = 'msa_cart_v1';
  const CURRENCY = 'RON';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch { return []; }
  }
  function save(items) {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
    return items;
  }
  function fmt(n) { return `${n.toFixed(2)} ${CURRENCY}`; }

  let items = load(); // [{id,name,price,image,qty}]

  function findIndex(id) { return items.findIndex(i => i.id === id); }

  function add(product, qty = 1) {
    qty = parseInt(qty, 10) || 1;
    const i = findIndex(product.id);
    if (i >= 0) {
      items[i].qty += qty;
    } else {
      items.push({ id: String(product.id), name: product.name, price: Number(product.price || 0), image: product.image || '', qty });
    }
    save(items);
    render();
  }

  function updateQty(id, qty) {
    qty = Math.max(0, parseInt(qty, 10) || 0);
    const i = findIndex(id);
    if (i < 0) return;
    if (qty === 0) {
      items.splice(i, 1);
    } else {
      items[i].qty = qty;
    }
    save(items);
    render();
  }

  function remove(id) { updateQty(id, 0); }

  function clearCart() {
    items = [];
    save(items);
    render();
  }

  function totals() {
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const discount =
      subtotal >= 400 ? subtotal * 0.20 :
      subtotal >= 300 ? subtotal * 0.15 :
      subtotal >= 200 ? subtotal * 0.10 : 0;
    const after = subtotal - discount;
    const shipping = subtotal === 0 ? 0 : (after >= 300 ? 0 : 17);
    const grand = after + shipping;
    return { subtotal, discount, shipping, grand };
  }

  function updateBadge() {
    const el = document.getElementById('cart-count');
    if (el) {
      const count = items.reduce((s, i) => s + i.qty, 0);
      el.textContent = count;
    }
  }

  function render() {
    updateBadge();

    // dacă nu suntem pe cos.html e ok, doar actualizăm badge-ul
    const body = document.getElementById('cart-body');
    const table = document.getElementById('cart-table');
    if (!body || !table) return;

    if (items.length === 0) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
    } else {
      body.innerHTML = items.map(it => `
        <tr data-id="${it.id}">
          <td>
            <div style="display:flex;gap:12px;align-items:center">
              ${it.image ? `<img src="${it.image}" alt="${it.name}" style="width:72px;height:72px;object-fit:cover;border-radius:8px">` : ``}
              <div><div class="name" style="font-weight:700">${it.name}</div></div>
            </div>
          </td>
          <td>${fmt(it.price)}</td>
          <td>
            <div class="qty" style="display:inline-flex;align-items:center;border:1px solid #ddd;border-radius:10px;background:#fff;overflow:hidden;">
              <button class="qminus" type="button" aria-label="Scade" style="width:36px;height:36px;border:0;background:#f6f6f6;font-weight:800;">−</button>
              <input class="qval" type="number" inputmode="numeric" min="0" value="${it.qty}" style="width:54px;height:36px;border:0;text-align:center;font-size:16px">
              <button class="qplus" type="button" aria-label="Crește" style="width:36px;height:36px;border:0;background:#f6f6f6;font-weight:800;">+</button>
            </div>
          </td>
          <td class="line-total">${fmt(it.price * it.qty)}</td>
          <td><button class="remove" type="button" aria-label="Șterge" title="Șterge" style="display:none">×</button></td>
        </tr>
      `).join('');
    }

    // totaluri în sidebar
    const t = totals();
    const elSub = document.getElementById('t-sub');
    const elDis = document.getElementById('t-disc');
    const elShip = document.getElementById('t-ship');
    const elTot = document.getElementById('t-total');
    if (elSub) elSub.textContent = fmt(t.subtotal);
    if (elDis) elDis.textContent = fmt(t.discount);
    if (elShip) elShip.textContent = fmt(t.shipping);
    if (elTot) elTot.textContent = fmt(t.grand);

    // evenimente pentru stepper
    body.querySelectorAll('tr').forEach(tr => {
      const id = tr.getAttribute('data-id');
      tr.querySelector('.qminus')?.addEventListener('click', () => {
        const current = parseInt(tr.querySelector('.qval').value || '0', 10) || 0;
        updateQty(id, Math.max(0, current - 1));
      });
      tr.querySelector('.qplus')?.addEventListener('click', () => {
        const current = parseInt(tr.querySelector('.qval').value || '0', 10) || 0;
        updateQty(id, current + 1);
      });
      tr.querySelector('.qval')?.addEventListener('input', (e) => {
        updateQty(id, e.target.value);
      });
      tr.querySelector('.remove')?.addEventListener('click', () => remove(id));
    });
  }

  // Listener global pentru butoanele „Adaugă în coș”
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;

    // atribute necesare
    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    const price = parseFloat(btn.getAttribute('data-price'));
    const image = btn.getAttribute('data-image') || '';

    if (!id || !name || isNaN(price)) {
      console.warn('Butonul .add-to-cart trebuie să aibă data-id, data-name, data-price');
      return;
    }

    const qtyAttr = btn.getAttribute('data-qty');
    const qty = qtyAttr ? parseInt(qtyAttr, 10) : 1;

    add({ id, name, price, image }, qty);
  });

  // Expune API
  window.MSACart = {
    add, updateQty, remove, clearCart,
    render, getItems: () => items.slice(),
    getTotals: totals,
    hookCheckout(formSel, btnSel) {
      const form = document.querySelector(formSel);
      const btn  = document.querySelector(btnSel);
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (btn) btn.disabled = true;

        const payload = {
          items: items.slice(),
          totals: totals(),
          data: Object.fromEntries(new FormData(form).entries()),
          createdAt: new Date().toISOString()
        };

        // Aici poți integra EmailJS / backend
        console.log('ORDER', payload);
        alert('Mulțumim! Comanda ta a fost înregistrată.');
        clearCart();
        if (btn) btn.disabled = false;
      });
    }
  };

  // initializează
  window.addEventListener('load', render);
})();
