/* =========================
   MSA Handmade – cart.js
   ========================= */

// Config reduceri și livrare
const RULES = {
  shippingFlat: 20,      // RON
  freeShippingFrom: 300, // RON
  discounts: [           // praguri -> procent
    { min: 400, pct: 0.20 },
    { min: 300, pct: 0.15 },
    { min: 200, pct: 0.10 },
  ],
};

// Chei EmailJS (le ai deja create)
const EMAIL = {
  SERVICE_ID: 'service_ix0zpp7',
  TEMPLATE_ADMIN: 'template_13qpqtt',
  TEMPLATE_CLIENT: 'template_9ycwtor',
};

// ============== helperi stocare ==============
const CART_KEY = 'MSA_CART';

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCountBadge();
}

function updateCartCountBadge() {
  const items = readCart();
  const count = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = count;
}

// ============== API coș disponibil global ==============
window.MSACart = {
  add(product, qty = 1) {
    const items = readCart();
    const idx = items.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      // există -> crește cantitatea (NU dubla)
      items[idx].qty = Number(items[idx].qty || 0) + Number(qty);
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || '',
        weight: product.weight || '',
        size: product.size || '',
        qty: Number(qty) || 1,
      });
    }
    writeCart(items);
  },
  changeQty(id, delta) {
    const items = readCart();
    const it = items.find(p => p.id === id);
    if (!it) return;
    it.qty = Math.max(1, Number(it.qty) + Number(delta));
    writeCart(items);
  },
  setQty(id, value) {
    const items = readCart();
    const it = items.find(p => p.id === id);
    if (!it) return;
    it.qty = Math.max(1, Number(value) || 1);
    writeCart(items);
  },
  remove(id) {
    const items = readCart().filter(p => p.id !== id);
    writeCart(items);
  },
  clear() { writeCart([]); },
  getCart() { return readCart(); },
  getTotals() {
    const items = readCart();
    const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    // reducere după pragul cel mai mare atins
    let pct = 0;
    for (const r of RULES.discounts) if (subtotal >= r.min && r.pct > pct) pct = r.pct;
    const reducere = subtotal * pct;
    const afterDisc = subtotal - reducere;
    const livrare = afterDisc >= RULES.freeShippingFrom || afterDisc === 0 ? 0 : RULES.shippingFlat;
    const total = afterDisc + livrare;
    return { subtotal, reducere, livrare, total };
  }
};

// ============== randare coș în cos.html ==============
function fmt(v) { return (Number(v) || 0).toFixed(2) + ' RON'; }

function renderCart() {
  const tbody = document.getElementById('cart-body');
  const items = MSACart.getCart();

  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="row-muted">Coșul este gol.</td></tr>`;
  } else {
    tbody.innerHTML = items.map(it => `
      <tr data-id="${it.id}">
        <td style="display:flex;gap:10px;align-items:center">
          <img class="thumb" src="${it.image || 'images/placeholder.jpg'}" alt="">
          <div><strong>${it.name}</strong><br><small>${fmt(it.price)}</small></div>
        </td>
        <td><small>${it.size ? 'Dim: '+it.size+' • ' : ''}${it.weight ? 'Greutate: '+it.weight : ''}</small></td>
        <td>
          <div class="qty">
            <button class="qminus" aria-label="minus">−</button>
            <input type="number" min="1" value="${it.qty}" style="width:54px" />
            <button class="qplus" aria-label="plus">+</button>
            <button class="qrm" title="Șterge" style="margin-left:6px">🗑</button>
          </div>
        </td>
        <td style="text-align:right"><strong>${fmt((it.price||0)*(it.qty||0))}</strong></td>
      </tr>
    `).join('');
  }

  // totaluri
  const t = MSACart.getTotals();
  const sub = document.getElementById('subval');
  const dis = document.getElementById('discval');
  const shp = document.getElementById('shipval');
  const tot = document.getElementById('totval');
  if (sub) sub.textContent = fmt(t.subtotal);
  if (dis) dis.textContent = fmt(t.reducere);
  if (shp) shp.textContent = fmt(t.livrare);
  if (tot) tot.textContent = fmt(t.total);

  bindRowEvents();
  updateCartCountBadge();
}

function bindRowEvents() {
  const tbody = document.getElementById('cart-body');
  if (!tbody) return;

  tbody.querySelectorAll('tr').forEach(row => {
    const id = row.dataset.id;
    if (!id) return;
    row.querySelector('.qminus')?.addEventListener('click', () => { MSACart.changeQty(id, -1); renderCart(); });
    row.querySelector('.qplus')?.addEventListener('click',  () => { MSACart.changeQty(id, +1); renderCart(); });
    row.querySelector('input[type="number"]')?.addEventListener('change', (e) => { MSACart.setQty(id, e.target.value); renderCart(); });
    row.querySelector('.qrm')?.addEventListener('click',   () => { MSACart.remove(id); renderCart(); });
  });
}

// ============== proformă HTML pentru email ==============
function buildProformaHTML(orderId, form, items, totals) {
  const rows = items.map(it => `
    <tr>
      <td>${it.name}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">${fmt(it.price)}</td>
      <td style="text-align:right"><strong>${fmt(it.price * it.qty)}</strong></td>
    </tr>`).join('');

  const firmaBlock = form.tip === 'PJ' ? `
    <tr><td colspan="4"><strong>Firmă:</strong> ${form.firma || '-'}</td></tr>
    <tr><td colspan="4">CUI: ${form.cui || '-'} · RC: ${form.rc || '-'}</td></tr>
    <tr><td colspan="4">IBAN: ${form.iban || '-'} · Banca: ${form.banca || '-'}</td></tr>
  ` : '';

  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0b1320">
    <h2 style="margin:0 0 6px 0">Proformă</h2>
    <div style="color:#555;margin-bottom:10px">Comanda #${orderId}</div>

    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th align="left" style="padding:8px;border-bottom:1px solid #eee">Produs</th>
          <th align="center" style="padding:8px;border-bottom:1px solid #eee">Cant.</th>
          <th align="right" style="padding:8px;border-bottom:1px solid #eee">Preț</th>
          <th align="right" style="padding:8px;border-bottom:1px solid #eee">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="4" style="padding:8px">Coș gol</td></tr>`}
      </tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:8px;text-align:right;color:#555">Subtotal</td><td align="right" style="padding:8px">${fmt(totals.subtotal)}</td></tr>
        <tr><td colspan="3" style="padding:8px;text-align:right;color:#555">Reducere</td><td align="right" style="padding:8px">${fmt(totals.reducere)}</td></tr>
        <tr><td colspan="3" style="padding:8px;text-align:right;color:#555">Livrare</td><td align="right" style="padding:8px">${fmt(totals.livrare)}</td></tr>
        <tr><td colspan="3" style="padding:8px;text-align:right;border-top:1px solid #eee"><strong>Total</strong></td><td align="right" style="padding:8px;border-top:1px solid #eee"><strong>${fmt(totals.total)}</strong></td></tr>
      </tfoot>
    </table>

    <div style="margin-top:10px">
      <strong>Client:</strong> ${form.nume || ''} ${form.prenume || ''} (${form.tip})
      <br/>Email: ${form.email || '-'} · Tel: ${form.telefon || '-'}
      <br/>Adresă: ${form.adresa || '-'}, ${form.oras || ''}, ${form.judet || ''}, ${form.codpostal || ''}
      ${firmaBlock}
      ${form.mentiuni ? `<br/><em>Mențiuni: ${form.mentiuni}</em>` : ''}
    </div>
  </div>
  `;
}

// ============== submit comandă (EmailJS) ==============
async function submitOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('place-order');
  const msg = document.getElementById('order-msg');
  msg.textContent = '';

  const items = MSACart.getCart();
  if (!items.length) {
    msg.textContent = 'Coșul este gol.';
    return;
  }

  // culege formular
  const fd = new FormData(document.getElementById('order-form'));
  const form = Object.fromEntries(fd.entries());

  // tip PF/PJ din radio (FormData ia ultima selectată, dar ne asigurăm)
  form.tip = (document.querySelector('input[name="tip"]:checked')?.value || 'PF');

  const order_id = (Date.now() + '').slice(-6); // id simplu
  const totals = MSACart.getTotals();

  // text produse pentru email admin
  const itemsText = items.map(it => `${it.name} x${it.qty} — ${fmt(it.price * it.qty)}`).join('\n');

  // HTML proformă pt. client
  const htmlProforma = buildProformaHTML(order_id, form, items, totals);

  // payload ADMIN
  const paramsAdmin = {
    tip: form.tip,
    nume: form.nume || '',
    prenume: form.prenume || '',
    email: form.email || '',
    telefon: form.telefon || '',
    judet: form.judet || '',
    oras: form.oras || '',
    codpostal: form.codpostal || '',
    adresa: form.adresa || '',
    firma: form.firma || '',
    cui: form.cui || '',
    rc: form.rc || '',
    produse: itemsText,
    subtotal: totals.subtotal.toFixed(2),
    livrare: totals.livrare.toFixed(2),
    total: totals.total.toFixed(2),
    mentiuni: form.mentiuni || '',
    order_id
  };

  // payload CLIENT – cheia trebuie să fie EXACT ca în EmailJS: html_proforma
  const paramsClient = {
    to_email: form.email,
    nume: form.nume || '',
    order_id,
    html_proforma: htmlProforma
  };

  btn.disabled = true; btn.textContent = 'Trimit...';

  try {
    // 1) spre magazin
    await emailjs.send(EMAIL.SERVICE_ID, EMAIL.TEMPLATE_ADMIN, paramsAdmin);
    // 2) spre client (include proforma HTML)
    await emailjs.send(EMAIL.SERVICE_ID, EMAIL.TEMPLATE_CLIENT, paramsClient);

    // succes
    MSACart.clear();
    msg.className = 'ok';
    msg.textContent = 'Comanda a fost trimisă cu succes! Ți-am trimis confirmarea pe email.';
    window.location.href = 'multumesc.html';
  } catch (err) {
    console.error('EmailJS error:', err);
    msg.className = 'bad';
    msg.textContent = 'A apărut o eroare la trimiterea emailurilor. Verifică ID-urile EmailJS și încearcă din nou.';
  } finally {
    btn.disabled = false; btn.textContent = 'Trimite comanda';
  }
}

// ============== init pagina ==============
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  // toggle câmpuri PJ
  const radios = document.querySelectorAll('input[name="tip"]');
  const pj = document.getElementById('pj-fields');
  radios.forEach(r => r.addEventListener('change', () => {
    if (!pj) return;
    pj.style.display = (document.querySelector('input[name="tip"]:checked')?.value === 'PJ') ? 'block' : 'none';
  }));

  // render coș + submit
  renderCart();
  document.getElementById('order-form')?.addEventListener('submit', submitOrder);

  // badge
  updateCartCountBadge();
  // sincronizează badge când se schimbă localStorage din alt tab/pagină
  window.addEventListener('storage', (e) => { if (e.key === CART_KEY) updateCartCountBadge(); });
});
