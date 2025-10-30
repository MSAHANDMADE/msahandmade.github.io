/* MSA Handmade — Coș + reduceri + livrare + EmailJS + proformă + anti-dubluri */
(function () {
  // ===== CONFIG =====
  const STORAGE_KEY   = 'msa_cart';
  const SHIPPING_BASE = 17;

  // EmailJS
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt';  // spre admin
  const TEMPLATE_CLIENT = 'template_9yctwor';  // spre client
  const ADMIN_EMAIL     = 'msahandmade.contact@gmail.com';

  // antispam / idempotency (10 minute)
  const IDEMP_KEY   = 'msa_last_order_sig';
  const IDEMP_TIME  = 'msa_last_order_ts';
  const IDEMP_TTL   = 10 * 60 * 1000; // 10 minute

  if (window.emailjs && typeof emailjs.init === 'function') {
    try { emailjs.init(PUBLIC_KEY); } catch (_) {}
  }

  // ===== UTIL =====
  const fmt = n => (Number(n) || 0).toFixed(2);
  const esc = s =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  async function sha256(str) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      // fallback simplu
      let h = 0; for (let i=0;i<str.length;i++) h = (h<<5)-h+str.charCodeAt(i)|0; 
      return String(h);
    }
  }

  const readCart = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  const clearCart = () => { saveCart([]); updateCartCountBadge(); };

  // ===== BADGE =====
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (parseInt(i.qty) || 1), 0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // ===== CRUD =====
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const idx = list.findIndex(p => p.id === id);
    price = Number(price) || 0;
    if (idx > -1) list[idx].qty = (parseInt(list[idx].qty) || 1) + 1;
    else list.push({ id, name: name || '', price, image: image || '', qty: 1 });
    saveCart(list);
    updateCartCountBadge();
  }

  function removeFromCart(indexOrId) {
    const list = readCart();
    const idx = (typeof indexOrId === 'number') ? indexOrId : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) { list.splice(idx, 1); saveCart(list); updateCartCountBadge(); }
  }

  function setQty(indexOrId, v) {
    const list = readCart();
    const idx = (typeof indexOrId === 'number') ? indexOrId : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) { list[idx].qty = Math.max(1, Number(v) || 1); saveCart(list); updateCartCountBadge(); }
  }

  // ===== TOTALURI (livrare 0 lei ≥300 RON) =====
  function computeTotals(list) {
    const subtotal = list.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    let pct = 0, shipping = SHIPPING_BASE;
    if (subtotal >= 400) { pct = 20; shipping = 0; }
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) { pct = 10; }
    const discount = +(subtotal * pct / 100).toFixed(2);
    const total = +((subtotal - discount + shipping)).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), discount, shipping: +shipping.toFixed(2), total, pct };
  }

  // ===== RENDER COȘ =====
  function render() {
    const list = readCart();
    const mount = document.getElementById('items');
    if (!mount) return;
    mount.innerHTML = '';

    if (!list.length) {
      mount.innerHTML = '<p>Coșul tău este gol.</p>';
    } else {
      list.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = 'cart-card';
        card.innerHTML = `
          <div class="cart-left"><img src="${p.image || 'logo.png'}" alt="${esc(p.name)}"></div>
          <div class="cart-mid">
            <div class="name">${esc(p.name)}</div>
            <div class="price">${fmt(p.price)} RON</div>
            <div class="qty">
              <button data-act="dec" aria-label="Scade">−</button>
              <input type="number" min="1" value="${p.qty || 1}">
              <button data-act="inc" aria-label="Crește">+</button>
              <button class="danger" data-act="del">Șterge</button>
            </div>
          </div>`;
        const input = card.querySelector('input');
        card.querySelector('[data-act="inc"]').onclick = () => { input.value = Number(input.value || 1) + 1; input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="dec"]').onclick = () => { input.value = Math.max(1, Number(input.value || 1) - 1); input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="del"]').onclick = () => { removeFromCart(idx); render(); };
        input.addEventListener('change', () => { setQty(idx, input.value); refreshTotals(); });
        mount.appendChild(card);
      });
    }
    refreshTotals();
  }

  function refreshTotals() {
    const t = computeTotals(readCart());
    const put = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    put('subtot', fmt(t.subtotal));
    put('disc',   fmt(t.discount));
    put('ship',   fmt(t.shipping));
    put('grand',  fmt(t.total));
    updateCartCountBadge();
  }

  // ===== PROFORMĂ HTML =====
  function makeProformaHTML(data, list, totals, orderId) {
    const firma = {
      denumire:'Stoica Mihaela – Persoană Fizică Autorizată',
      cui:'52197623',
      regcom:'F2025026596007',
      adresa:'Str. Generalului nr. 10, Bl. 1, Sc. 1, Ap. 2, Bragadiru, IF',
      iban:'RO71 ROIN 4021 V44X 12E1 65BQ',
      banca:'Salt Bank'
    };

    const clientPF = `
      <div style="line-height:1.5">
        <div style="font-weight:700;margin-bottom:4px">Client (PF)</div>
        <div>${esc(data.nume)} ${esc(data.prenume)}</div>
        <div>Email: <a href="mailto:${esc(data.email)}" style="color:#0b62">${esc(data.email)}</a></div>
        <div>Tel: ${esc(data.telefon)}</div>
        <div>Adresă: ${esc(data.adresa)}, ${esc(data.oras)}, ${esc(data.judet)} ${esc(data.codpostal)}</div>
      </div>`;

    const clientPJ = `
      <div style="line-height:1.5">
        <div style="font-weight:700;margin-bottom:4px">Client (PJ)</div>
        <div>${esc(data.firma||'')}</div>
        <div>CUI: ${esc(data.cui||'')} · Reg. Com.: ${esc(data.regcom||'')}</div>
        <div>Persoană de contact: ${esc(data.nume)} ${esc(data.prenume)}</div>
        <div>Email: <a href="mailto:${esc(data.email)}" style="color:#0b62">${esc(data.email)}</a></div>
        <div>Tel: ${esc(data.telefon)}</div>
        <div>Adresă: ${esc(data.adresa)}, ${esc(data.oras)}, ${esc(data.judet)} ${esc(data.codpostal)}</div>
      </div>`;
    const clientBlock = (data.tip === 'Persoană juridică') ? clientPJ : clientPF;

    const rows = list.map(i=>{
      const line = (Number(i.price)||0) * (Number(i.qty)||1);
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(i.name||'')}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${Number(i.qty)||1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(i.price)} RON</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(line)} RON</td>
        </tr>`;
    }).join('');

    return `
    <div style="font-family:ui-sans-serif,-apple-system,Segoe UI,Roboto,Arial;max-width:760px;margin:16px auto;padding:14px;border:1px solid #eaeaea;border-radius:12px;background:#fff">
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap">
        <div style="flex:1 1 240px;min-width:240px">
          <div style="font-size:18px;font-weight:700;margin-bottom:6px">MSA Handmade</div>
          <div style="color:#666;line-height:1.5">
            ${firma.denumire}<br>
            CUI: ${firma.cui} · Reg. Com.: ${firma.regcom}<br>
            IBAN: ${firma.iban} · ${firma.banca}<br>
            ${firma.adresa}
          </div>
        </div>

        <div style="flex:0 0 180px;min-width:180px;text-align:center;border:1px solid #eee;border-radius:10px;padding:10px">
          <div style="font-weight:700;margin-bottom:6px">Proformă</div>
          <div style="font-family:monospace;font-weight:700">#${orderId}</div>
          <div style="color:#666;margin-top:6px">${new Date().toLocaleString('ro-RO')}</div>
        </div>

        <div style="flex:1 1 240px;min-width:240px;text-align:right">
          ${clientBlock}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead>
          <tr style="background:#fafafa">
            <th style="text-align:left;padding:10px;border-bottom:2px solid #222">Produs</th>
            <th style="text-align:center;padding:10px;border-bottom:2px solid #222;width:90px">Cant.</th>
            <th style="text-align:right;padding:10px;border-bottom:2px solid #222;width:140px">Preț</th>
            <th style="text-align:right;padding:10px;border-bottom:2px solid #222;width:160px">Total</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" style="padding:12px">—</td></tr>'}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right;padding:8px 10px;color:#444">Subtotal</td><td style="text-align:right;padding:8px 10px"><strong>${fmt(totals.subtotal)} RON</strong></td></tr>
          <tr><td colspan="3" style="text-align:right;padding:8px 10px;color:#444">Reducere ${totals.pct||0}%</td><td style="text-align:right;padding:8px 10px">− ${fmt(totals.discount)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:8px 10px;color:#444">Livrare</td><td style="text-align:right;padding:8px 10px">${fmt(totals.shipping)} RON</td></tr>
          <tr>
            <td colspan="3" style="text-align:right;padding:12px 10px;font-weight:700;border-top:2px solid #222">TOTAL</td>
            <td style="text-align:right;padding:12px 10px;font-weight:700;border-top:2px solid #222">${fmt(totals.total)} RON</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top:10px;color:#666;font-size:12px;line-height:1.4">
        * Proforma nu ține loc de factură. Factura fiscală va fi emisă la expedierea comenzii.
      </div>
    </div>`;
  }

  // ===== TRIMITERE COMANDĂ (cu anti-dubluri) =====
  let SENDING = false;

  async function submitOrder(formElOrFormData) {
    if (SENDING) return false; // blocăm dublu-click
    const list = readCart();
    if (!list.length) { alert('Coșul este gol.'); return false; }

    const fd = (formElOrFormData instanceof FormData)
      ? formElOrFormData
      : new FormData(formElOrFormData);

    const data = Object.fromEntries(fd.entries());
    const totals = computeTotals(list);

    // semnătură unică pe conținut + email client
    const signature = await sha256(JSON.stringify({ list, email: data.email || '', totals }));

    // verificăm ultimele 10 minute
    const lastSig = localStorage.getItem(IDEMP_KEY);
    const lastTs  = Number(localStorage.getItem(IDEMP_TIME) || 0);
    const now     = Date.now();

    if (lastSig === signature && now - lastTs < IDEMP_TTL) {
      // aceeași comandă, nu retrimitem
      try { window.location.href = 'multumesc.html'; } catch (_) {}
      return false;
    }

    // marcăm imediat ca „în curs” ca să blocăm alte clickuri
    SENDING = true;
    localStorage.setItem(IDEMP_KEY, signature);
    localStorage.setItem(IDEMP_TIME, String(now));

    // ID comandă
    const orderId = Math.random().toString(36).slice(2, 7).toUpperCase();
    const html_proforma = makeProformaHTML(data, list, totals, orderId);
    const produseText = list.map(i => `• ${i.name} x ${i.qty} = ${fmt((Number(i.price)||0)*(Number(i.qty)||1))} RON`).join('\n');

    try {
      if (!window.emailjs) throw new Error('EmailJS indisponibil');

      // CLIENT
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, {
        to_email: data.email || '',
        order_id: orderId,
        nume: data.nume || '',
        html_proforma,
      });

      // ADMIN
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, {
        to_email: ADMIN_EMAIL,
        order_id: orderId,
        tip: data.tip || 'Persoană fizică',
        nume: data.nume || '',
        prenume: data.prenume || '',
        email: data.email || '',
        telefon: data.telefon || '',
        judet: data.judet || '',
        oras: data.oras || '',
        codpostal: data.codpostal || '',
        adresa: data.adresa || '',
        produse: produseText,
        subtotal: fmt(totals.subtotal),
        livrare: fmt(totals.shipping),
        total: fmt(totals.total),
        mentiuni: data.mentiuni || ''
      });

      clearCart();
      try { window.location.href = 'multumesc.html'; } catch (_) {}
      return true;
    } catch (err) {
      // dacă a eșuat, deblocăm și curățăm semnătura ca să poată reîncerca
      console.error(err);
      alert('A apărut o problemă la trimiterea comenzii. Te rugăm să încerci din nou.');
      SENDING = false;
      localStorage.removeItem(IDEMP_KEY);
      localStorage.removeItem(IDEMP_TIME);
      return false;
    }
  }

  // ===== Helper: leagă automat formularul de checkout și gestionează butonul =====
  function hookCheckout(formSelector = '#checkout-form', buttonSelector = '#place-order') {
    const form = document.querySelector(formSelector);
    const btn  = document.querySelector(buttonSelector);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btn) { btn.disabled = true; btn.textContent = 'Se trimite…'; }
      const ok = await submitOrder(form);
      if (!ok && btn) { btn.disabled = false; btn.textContent = 'Trimite comanda'; }
    });

    // fallback pentru click direct pe buton (dublu apăsări etc.)
    if (btn) {
      btn.addEventListener('click', (e) => {
        if (SENDING) { e.preventDefault(); return false; }
      });
    }
  }

  // ===== Expose + init =====
  window.MSACart = {
    readCart, saveCart, addToCart, removeFromCart, clearCart, setQty,
    computeTotals, render, submitOrder, updateCartCountBadge, hookCheckout
  };

  document.addEventListener('DOMContentLoaded', () => {
    updateCartCountBadge();
    if (document.getElementById('items')) render();
  });
})();
