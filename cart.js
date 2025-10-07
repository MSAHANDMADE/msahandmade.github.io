/* MSA Handmade — coș + reduceri automate + livrare gratuită ≥ 300 + EmailJS + proformă în email */
(function () {
  // === CONFIG ===
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING_BASE = 17;

  // EmailJS (cheile tale)
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt'; // către tine
  const TEMPLATE_CLIENT = 'template_9yctwor'; // către client (conține {{{proforma_html}}})

  // Inițializează EmailJS (dacă SDK-ul e încărcat în cos.html)
  if (window.emailjs && typeof emailjs.init === 'function') {
    try { emailjs.init(PUBLIC_KEY); } catch(e){}
  }

  // === STORAGE ===
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));

  // === BADGE ===
  function updateCartCountBadge() {
    const list  = readCart();
    const count = list.reduce((s,i)=> s + (parseInt(i.qty)||1), 0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CRUD ===
  function addToCart({id, name, price, image}) {
    if (!id) return;
    const list = readCart();
    const idx  = list.findIndex(p => p.id === id);
    price = Number(price)||0;
    if (idx > -1) list[idx].qty = (parseInt(list[idx].qty)||1) + 1;
    else list.push({ id, name: name||'', price, image: image||'', qty: 1 });
    saveCart(list); updateCartCountBadge();
  }
  function removeFromCart(indexOrId) {
    const list = readCart();
    const idx  = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1){ list.splice(idx,1); saveCart(list); updateCartCountBadge(); }
  }
  function clearCart(){ saveCart([]); updateCartCountBadge(); }
  function setQty(indexOrId, v){
    const list = readCart();
    const idx  = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1){
      list[idx].qty = Math.max(1, Number(v)||1);
      saveCart(list); updateCartCountBadge();
    }
  }

  // === TOTALS ===
  function computeTotals(list) {
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
    let pct = 0, shipping = SHIPPING_BASE;
    if (subtotal >= 400) pct = 20;
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) pct = 10;

    const discount = +(subtotal * pct / 100).toFixed(2);
    const total    = +((subtotal - discount + shipping)).toFixed(2);
    return { subtotal:+subtotal.toFixed(2), discount, shipping:+shipping.toFixed(2), total, pct };
  }
  const fmt = (n)=> (Number(n)||0).toFixed(2);

  // === RENDER (pentru cos.html) ===
  function render() {
    const list  = readCart();
    const mount = document.getElementById('items');
    if (!mount) return;
    mount.innerHTML = '';

    if (!list.length) {
      mount.innerHTML = '<p>Coșul tău este gol.</p>';
    } else {
      list.forEach((p,idx)=>{
        const card = document.createElement('div');
        card.className = 'cart-card';
        card.innerHTML = `
          <div class="cart-left">
            <img src="${p.image||'logo.png'}" alt="${p.name||''}">
          </div>
          <div class="cart-mid">
            <div class="name">${p.name||''}</div>
            <div class="price">${fmt(p.price)} RON</div>
            <div class="qty">
              <button data-act="dec">−</button>
              <input type="number" min="1" value="${p.qty||1}">
              <button data-act="inc">+</button>
              <button class="danger" data-act="del">Șterge</button>
            </div>
          </div>
        `;
        // bindings
        const input = card.querySelector('input');
        card.querySelector('[data-act="inc"]').onclick = ()=>{ input.value = Number(input.value||1)+1; input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="dec"]').onclick = ()=>{ input.value = Math.max(1, Number(input.value||1)-1); input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="del"]').onclick = ()=>{ removeFromCart(idx); render(); };

        input.addEventListener('change', ()=>{
          setQty(idx, input.value);
          refreshTotals();
        });

        mount.appendChild(card);
      });
    }
    refreshTotals();
  }

  function refreshTotals() {
    const t = computeTotals(readCart());
    const put = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };
    put('subtot', fmt(t.subtotal));
    put('disc',   fmt(t.discount));
    put('ship',   fmt(t.shipping));
    put('grand',  fmt(t.total));
    updateCartCountBadge();
  }

  // === PROFORMA (HTML simplu încorporat în email) ===
  function makeProformaHTML(data, list, totals, orderId){
    // date firmă (vânzător) – PFA Stoica Mihaela
    const firma = {
      denumire:'Stoica Mihaela – Persoană Fizică Autorizată',
      cui:'52197623',
      regcom:'F2025026596007',
      adresa:'Str. Generalului nr. 10, Bl. 1, Sc. 1, Ap. 2, Bragadiru, IF',
      iban:'RO71 ROIN 4021 V44X 12E1 65BQ',
      banca:'Salt Bank'
    };
    const clientBlock = (()=>{
      const tip = data.tip || 'Persoană fizică';
      if (tip === 'Persoană juridică') {
        return `
          <div><strong>Client (PJ)</strong></div>
          <div>${escapeHtml(data.firma||'')}</div>
          <div>CUI: ${escapeHtml(data.cui||'')}</div>
          <div>Reg. Com.: ${escapeHtml(data.regcom||'')}</div>
          <div>Persoană de contact: ${escapeHtml(data.nume||'')} ${escapeHtml(data.prenume||'')}</div>
          <div>Email: ${escapeHtml(data.email||'')} · Tel: ${escapeHtml(data.telefon||'')}</div>
          <div>Adresă: ${escapeHtml(data.adresa||'')}, ${escapeHtml(data.oras||'')}, ${escapeHtml(data.judet||'')} ${escapeHtml(data.codpostal||'')}</div>
        `;
      }
      return `
        <div><strong>Client (PF)</strong></div>
        <div>${escapeHtml(data.nume||'')} ${escapeHtml(data.prenume||'')}</div>
        <div>Email: ${escapeHtml(data.email||'')} · Tel: ${escapeHtml(data.telefon||'')}</div>
        <div>Adresă: ${escapeHtml(data.adresa||'')}, ${escapeHtml(data.oras||'')}, ${escapeHtml(data.judet||'')} ${escapeHtml(data.codpostal||'')}</div>
      `;
    })();

    const rows = list.map(i=>`
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtml(i.name||'')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${Number(i.qty)||1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt(i.price)} RON</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt((Number(i.price)||0)*(Number(i.qty)||1))} RON</td>
      </tr>
    `).join('');

    return `
    <div style="font-family:ui-sans-serif,-apple-system,Segoe UI,Roboto,Arial;max-width:720px;margin:18px auto;padding:16px;border:1px solid #eee;border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <h3 style="margin:0 0 6px 0">MSA Handmade</h3>
          <div style="color:#666">
            ${firma.denumire}<br>
            CUI: ${firma.cui} · Reg. Com.: ${firma.regcom}<br>
            IBAN: ${firma.iban} · ${firma.banca}<br>
            ${firma.adresa}
          </div>
        </div>
        <div style="text-align:right">
          <div><strong>Proformă:</strong> #${orderId}</div>
          <div style="color:#666">${new Date().toLocaleString('ro-RO')}</div>
        </div>
      </div>

      <div style="display:flex;gap:24px;margin:10px 0">
        <div style="flex:1">${clientBlock}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #222">Produs</th>
            <th style="text-align:center;padding:8px;border-bottom:2px solid #222">Cant.</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #222">Preț</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #222">Total</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" style="padding:8px">—</td></tr>'}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right;padding:6px 8px">Subtotal</td><td style="text-align:right;padding:6px 8px">${fmt(totals.subtotal)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:6px 8px">Reducere ${totals.pct||0}%</td><td style="text-align:right;padding:6px 8px">− ${fmt(totals.discount)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:6px 8px">Livrare</td><td style="text-align:right;padding:6px 8px">${fmt(totals.shipping)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:10px 8px;font-weight:700;border-top:2px solid #222">TOTAL</td><td style="text-align:right;padding:10px 8px;font-weight:700;border-top:2px solid #222">${fmt(totals.total)} RON</td></tr>
        </tfoot>
      </table>
      <div style="margin-top:10px;color:#666;font-size:12px">* Proforma nu ține loc de factură. Factura fiscală va fi emisă la expedierea comenzii.</div>
    </div>`;
  }
  const escapeHtml = (s)=> String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // === SUBMIT ORDER (apelat din cos.html) ===
  async function submitOrder(formElOrFormData) {
    const list = readCart();
    if (!list.length) throw new Error('Cos gol');

    // colectăm datele din formular
    const fd = (formElOrFormData instanceof FormData)
      ? formElOrFormData
      : new FormData(formElOrFormData);

    const data = Object.fromEntries(fd.entries());
    const totals = computeTotals(list);
    const orderId = Math.random().toString(36).slice(2,7).toUpperCase();

    // pentru pagina /proforma.html, dacă vrei
    try {
      localStorage.setItem('msa_last_order', JSON.stringify({
        id: orderId, ts: Date.now(), list, totals, data
      }));
    } catch {}

    // compunem produse text pentru email-ul admin
    const produseText = list.map(i =>
      `• ${i.name} x ${i.qty} = ${fmt((Number(i.price)||0)*(Number(i.qty)||1))} RON`
    ).join('\n');

    // proforma HTML pentru client
    const proforma_html = makeProformaHTML(data, list, totals, orderId);

    // payload către tine (admin)
    const adminVars = {
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
      mentiuni: data.mentiuni || '',
      order_id: orderId
    };

    // payload către client (confirmare cu proformă)
    const clientVars = {
      email: data.email || '',
      nume: data.nume || '',
      order_id: orderId,
      proforma_html // ← va fi injectată cu {{{proforma_html}}} în șablon
    };

    // trimitem emailurile
    if (!window.emailjs) throw new Error('EmailJS indisponibil');

    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, adminVars);
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, clientVars);

    // golim coșul și succes
    clearCart();
    try { window.location.href = 'multumesc.html'; } catch {}
    return true;
  }

  // === EXPOSE ===
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart, setQty,
    computeTotals, render, submitOrder,
  };

  // auto-init pe paginile care au coș
  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartCountBadge();
    // dacă există containerul de coș, îl randează
    if (document.getElementById('items')) render();
  });
})();
