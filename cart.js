/* ==============================
   M.S.A Handmade Decor — cart.js
   Coș de cumpărături + randare + reduceri + livrare + proforma helper
   ============================== */

(function () {
  const STORAGE_KEY = 'msa_cart_v1';

  // Politici: reduceri & livrare
  const DISCOUNTS = [
    { min: 400, pct: 0.20 },
    { min: 300, pct: 0.15 },
    { min: 200, pct: 0.10 }
  ];
  const SHIPPING_FLAT = 20;           // livrare standard
  const FREE_SHIPPING_FROM = 300;     // livrare gratuită de la 300 RON

  function money(v) {
    return (Math.round(v * 100) / 100).toFixed(2);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartCountBadge();
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    updateCartCountBadge();
  }

  function addToCart(product, qty = 1) {
    const cart = getCart();
    const idx = cart.findIndex(p => p.id === product.id);
    if (idx > -1) {
      cart[idx].qty += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image || '',
        qty: qty
      });
    }
    saveCart(cart);
    // feedback vizual (dacă există #cart-count)
    const pill = document.getElementById('cart-count');
    if (pill) {
      pill.classList.add('badge');
      pill.textContent = cart.reduce((s, p) => s + p.qty, 0);
    }
  }

  function remove(id) {
    const cart = getCart().filter(p => p.id !== id);
    saveCart(cart);
    renderCart();
  }

  function setQty(id, qty) {
    const cart = getCart();
    const p = cart.find(x => x.id === id);
    if (!p) return;
    p.qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
    renderCart();
  }

  function updateCartCountBadge() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const cart = getCart();
    const n = cart.reduce((s, p) => s + p.qty, 0);
    el.textContent = n;
  }

  function bestDiscount(subtotal) {
    for (const r of DISCOUNTS) {
      if (subtotal >= r.min) return r.pct;
    }
    return 0;
  }

  function _calcTotals(cart) {
    const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
    const discPct = bestDiscount(subtotal);
    const discount = subtotal * discPct;
    const afterDisc = subtotal - discount;
    const shipping = afterDisc >= FREE_SHIPPING_FROM || afterDisc === 0 ? 0 : SHIPPING_FLAT;
    const total = afterDisc + shipping;
    return { subtotal, discount, shipping, total, discPct };
  }

  function renderCart() {
    const mount = document.getElementById('cart-mount');
    if (!mount) return;

    const cart = getCart();
    const totals = _calcTotals(cart);

    if (!cart.length) {
      mount.innerHTML = `
        <div class="box">
          <p>Coșul tău este gol.</p>
          <p><a class="btn btn-primary" href="produse.html">Vezi produsele</a></p>
        </div>
      `;
      return;
    }

    const rows = cart.map(p => `
      <tr>
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${p.image}" alt="${p.name}" style="width:64px;height:64px;object-fit:cover;border-radius:8px">
            <div>${p.name}</div>
          </div>
        </td>
        <td style="text-align:right">${money(p.price)} RON</td>
        <td style="text-align:center">
          <div class="qty">
            <button type="button" aria-label="-" data-min="${p.id}">–</button>
            <input value="${p.qty}" inputmode="numeric" pattern="[0-9]*" data-qty="${p.id}">
            <button type="button" aria-label="+" data-plus="${p.id}">+</button>
          </div>
          <button class="btn ghost" data-remove="${p.id}" style="margin-top:6px">Șterge</button>
        </td>
        <td style="text-align:right;font-weight:700">${money(p.price * p.qty)} RON</td>
      </tr>
    `).join('');

    mount.innerHTML = `
      <div class="box">
        <table class="cart">
          <thead>
            <tr>
              <th>Produs</th>
              <th>Preț</th>
              <th>Cant.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals" style="margin-top:16px">
          <div class="row"><span>Subtotal</span><strong>${money(totals.subtotal)} RON</strong></div>
          ${totals.discount > 0 ? `<div class="row"><span>Reducere (${Math.round(totals.discPct*100)}%)</span><strong>- ${money(totals.discount)} RON</strong></div>` : ``}
          <div class="row"><span>Livrare ${totals.shipping === 0 ? '(GRATUITĂ)' : ''}</span><strong>${money(totals.shipping)} RON</strong></div>
          <div class="row big"><span>Total</span><strong>${money(totals.total)} RON</strong></div>
          <p class="muted">Reduceri automate: ≥200 RON −10%, ≥300 RON −15%, ≥400 RON −20%.<br>Livrare gratuită de la 300 RON.</p>
        </div>
      </div>
    `;

    // evenimente minus/plus/qty/remove
    mount.querySelectorAll('[data-min]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-min');
        const cart = getCart();
        const p = cart.find(x => x.id === id);
        if (!p) return;
        p.qty = Math.max(1, p.qty - 1);
        saveCart(cart);
        renderCart();
      });
    });
    mount.querySelectorAll('[data-plus]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-plus');
        const cart = getCart();
        const p = cart.find(x => x.id === id);
        if (!p) return;
        p.qty += 1;
        saveCart(cart);
        renderCart();
      });
    });
    mount.querySelectorAll('[data-qty]').forEach(inp => {
      inp.addEventListener('change', () => {
        const id = inp.getAttribute('data-qty');
        setQty(id, Number(inp.value));
      });
    });
    mount.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => remove(btn.getAttribute('data-remove')));
    });
  }

  /**
   * Construieste HTML-ul proformei folosind proforma.html ca șablon.
   * proforma.html trebuie să conțină placeholder-ele:
   * {{order_id}}, {{nume}}, {{prenume}}, {{tip}}, {{email}}, {{telefon}},
   * {{adresa}}, {{oras}}, {{judet}}, {{codpostal}}, {{mentiuni}},
   * {{rows}}, {{subtotal}}, {{discount}}, {{shipping}}, {{total}}
   */
  async function buildProformaHTML(cart, totals, form) {
    // generează rândurile produselor
    const rows = cart.map(p => `
      <tr>
        <td>${p.name}</td>
        <td style="text-align:center">${p.qty}</td>
        <td style="text-align:right">${money(p.price)} RON</td>
        <td style="text-align:right"><strong>${money(p.price * p.qty)} RON</strong></td>
      </tr>
    `).join('');

    try {
      const res = await fetch('proforma.html', { cache: 'no-store' });
      let tpl = await res.text();

      const map = {
        '{{order_id}}': form.order_id,
        '{{nume}}': form.nume,
        '{{prenume}}': form.prenume,
        '{{tip}}': form.tip,
        '{{email}}': form.email,
        '{{telefon}}': form.telefon,
        '{{adresa}}': form.adresa,
        '{{oras}}': form.oras,
        '{{judet}}': form.judet,
        '{{codpostal}}': form.codpostal,
        '{{mentiuni}}': (form.mentiuni || '-'),
        '{{rows}}': rows,
        '{{subtotal}}': money(totals.subtotal),
        '{{discount}}': money(totals.discount),
        '{{shipping}}': money(totals.shipping),
        '{{total}}': money(totals.total)
      };

      Object.keys(map).forEach(k => {
        tpl = tpl.split(k).join(map[k]);
      });

      return tpl;
    } catch (e) {
      // fallback simplu dacă nu reușește fetch-ul
      return `
        <h2>Detalii comandă #${form.order_id}</h2>
        <p><b>${form.nume} ${form.prenume}</b> — ${form.email} / ${form.telefon}</p>
        <p>${form.adresa}, ${form.oras}, ${form.judet}, ${form.codpostal}</p>
        <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
          <thead><tr><th>Produs</th><th>Cant.</th><th>Preț</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p>Subtotal: ${money(totals.subtotal)} RON</p>
        ${totals.discount>0?`<p>Reducere: -${money(totals.discount)} RON</p>`:''}
        <p>Livrare: ${money(totals.shipping)} RON</p>
        <p><b>Total: ${money(totals.total)} RON</b></p>
      `;
    }
  }

  // API public
  window.MSACart = {
    getCart, saveCart, clear,
    addToCart, remove, setQty,
    renderCart, updateCartCountBadge,
    _calcTotals, money,
    buildProformaHTML
  };
})();
