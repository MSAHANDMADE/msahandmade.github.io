/* ================================
   MSA Handmade – cart.js (final)
   LocalStorage cart + render + checkout hook
   ================================ */

(function () {
  const LS_KEY = 'msa_cart_v2';

  // --- Config ---
  const SHIPPING_FEE = 17;               // taxa standard
  const FREE_SHIPPING_FROM = 300;        // prag livrare gratuită
  // reduceri automate (ordinea contează: descrescător ca prag)
  const DISCOUNTS = [
    { from: 400, percent: 20 },
    { from: 300, percent: 15 },
    { from: 200, percent: 10 },
  ];

  // --- Helpers ---
  const fmt = (n) => `${Number(n).toFixed(2)} RON`;

  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  }
  function save(cart) {
    localStorage.setItem(LS_KEY, JSON.stringify(cart));
    updateCartCountBadge();
  }

  // --- Public API container ---
  const api = (window.MSACart = window.MSACart || {});

  // Add / Set / Clear
  api.addToCart = function ({ id, name, price, image }) {
    const cart = load();
    const idx = cart.findIndex((x) => x.id === id);
    if (idx >= 0) {
      cart[idx].qty += 1;
    } else {
      cart.push({ id, name, price: Number(price), image, qty: 1 });
    }
    save(cart);
  };

  api.setQty = function (id, qty) {
    let cart = load();
    const row = cart.find((x) => x.id === id);
    if (!row) return;
    const q = Math.max(1, parseInt(qty || 1, 10));
    row.qty = q;
    save(cart);
  };

  api.remove = function (id) {
    let cart = load().filter((x) => x.id !== id);
    save(cart);
  };

  api.clearCart = function () {
    save([]);
  };

  // Badge (🛒 <span id="cart-count">N</span>)
  function updateCartCountBadge() {
    const n = load().reduce((s, r) => s + r.qty, 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = n;
  }
  api.updateCartCountBadge = updateCartCountBadge;

  // --- Totals ---
  function getTotals() {
    const cart = load();
    const subtotal = cart.reduce((s, r) => s + r.price * r.qty, 0);

    // discount progresiv
    let discount = 0;
    for (const rule of DISCOUNTS) {
      if (subtotal >= rule.from) {
        discount = (rule.percent / 100) * subtotal;
        break;
      }
    }

    // livrare
    const shipping = subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_FEE;
    const total = Math.max(0, subtotal - discount) + shipping;

    return { subtotal, discount, shipping, total };
  }

  // --- Render coș (pentru cos.html) ---
  api.render = function () {
    const cart = load();
    updateCartCountBadge();

    // Tabel
    const tbody = document.getElementById('cart-body');
    if (!tbody) return;

    if (!cart.length) {
      tbody.innerHTML = `<tr><td colspan="5">Coșul tău este gol.</td></tr>`;
    } else {
      tbody.innerHTML = cart
        .map((r) => {
          const lineTotal = r.price * r.qty;
          return `
          <tr data-id="${r.id}">
            <td>
              <div style="display:flex; gap:10px; align-items:center">
                <img src="${r.image}" alt="${r.name}" width="72" height="72" style="border-radius:8px; object-fit:cover">
                <div class="prod-name">${r.name}</div>
              </div>
            </td>
            <td>${fmt(r.price)}</td>
            <td>
              <div class="qty">
                <button class="qminus" aria-label="Scade" type="button">−</button>
                <input class="qinput" type="number" min="1" value="${r.qty}" aria-label="Cantitate">
                <button class="qplus" aria-label="Crește" type="button">+</button>
              </div>
            </td>
            <td>${fmt(lineTotal)}</td>
            <td>
              <button class="btn ghost btn-remove" type="button" aria-label="Șterge">✕</button>
            </td>
          </tr>`;
        })
        .join('');
    }

    // Totals
    const { subtotal, discount, shipping, total } = getTotals();
    const elSub = document.getElementById('t-sub');
    const elDisc = document.getElementById('t-disc');
    const elShip = document.getElementById('t-ship');
    const elTot = document.getElementById('t-total');
    if (elSub) elSub.textContent = fmt(subtotal);
    if (elDisc) elDisc.textContent = fmt(discount);
    if (elShip) elShip.textContent = fmt(shipping);
    if (elTot) elTot.textContent = fmt(total);

    // Bind qty +/- & remove
    tbody.querySelectorAll('tr').forEach((row) => {
      const id = row.getAttribute('data-id');
      const minus = row.querySelector('.qminus');
      const plus = row.querySelector('.qplus');
      const input = row.querySelector('.qinput');
      const removeBtn = row.querySelector('.btn-remove');

      minus?.addEventListener('click', () => {
        const q = Math.max(1, parseInt(input.value || '1', 10) - 1);
        input.value = q;
        api.setQty(id, q);
        api.render();
      });
      plus?.addEventListener('click', () => {
        const q = Math.max(1, parseInt(input.value || '1', 10) + 1);
        input.value = q;
        api.setQty(id, q);
        api.render();
      });
      input?.addEventListener('change', () => {
        const q = Math.max(1, parseInt(input.value || '1', 10));
        api.setQty(id, q);
        api.render();
      });
      removeBtn?.addEventListener('click', () => {
        api.remove(id);
        api.render();
      });
    });
  };

  // --- Checkout hook (trimite comandă prin EmailJS dacă există, altfel doar proformă) ---
  api.hookCheckout = function (formSelector, submitBtnSelector) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cart = load();
      if (!cart.length) {
        alert('Coșul este gol.');
        return;
      }

      // colectare form
      const data = Object.fromEntries(new FormData(form).entries());

      // sumar comandă
      const { subtotal, discount, shipping, total } = getTotals();
      const lines = cart
        .map((r) => `- ${r.name} × ${r.qty} = ${fmt(r.price * r.qty)}`)
        .join('\n');

      const message =
        `Comandă MSA Handmade\n\n` +
        `Tip: ${data.tip || '-'}\n` +
        (data.firma ? `Firmă: ${data.firma}\n` : '') +
        (data.cui ? `CUI: ${data.cui}\n` : '') +
        (data.regcom ? `Reg. Com.: ${data.regcom}\n` : '') +
        `Nume: ${data.nume || ''} ${data.prenume || ''}\n` +
        `Email: ${data.email || ''}\n` +
        `Telefon: ${data.telefon || ''}\n` +
        `Adresă: ${data.adresa || ''}, ${data.oras || ''}, ${data.judet || ''} (${data.codpostal || ''})\n` +
        (data.mentiuni ? `Observații: ${data.mentiuni}\n` : '') +
        `\nProduse:\n${lines}\n\n` +
        `Subtotal: ${fmt(subtotal)}\n` +
        `Reducere: ${fmt(discount)}\n` +
        `Livrare: ${fmt(shipping)}\n` +
        `TOTAL:   ${fmt(total)}\n`;

      // Dacă există EmailJS în pagină, încearcă trimiterea
      const btn = submitBtnSelector ? document.querySelector(submitBtnSelector) : null;
      const oldTxt = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Se trimite…'; }

      try {
        if (window.emailjs && emailjs.send) {
          // !!! Configurează-ți SERVICE_ID / TEMPLATE_ID în EmailJS
          const SERVICE_ID = 'msa_service';
          const TEMPLATE_ID = 'msa_order_template';
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            to_email: 'msahandmade.contact@gmail.com',
            subject: 'Comandă nouă MSA Handmade',
            message,
          });
          alert('Mulțumim! Comanda a fost trimisă. Te contactăm în curând.');
        } else {
          // fallback simplu
          console.log(message);
          alert('Mulțumim! Comanda a fost înregistrată (mod test).');
        }
        api.clearCart();
        api.render();
        form.reset();
        // revine la Persoană fizică implicit
        const pf = form.querySelector('input[name="tip"][value="Persoană fizică"]');
        if (pf) pf.checked = true;
        const pj = document.getElementById('pj-extra'); if (pj) pj.style.display = 'none';
      } catch (err) {
        console.error(err);
        alert('Ups, nu am putut trimite comanda. Încearcă din nou.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = oldTxt; }
      }
    });
  };

  // Init badge la încărcare
  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
