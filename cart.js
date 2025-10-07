/* MSA Handmade — Coș + reduceri + EmailJS + proformă */
(function () {
  // === CONFIG ===
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING_BASE = 17;

  // EmailJS
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';    // user/public key
  const SERVICE_ID      = 'service_ix0zpp7';      // service id
  const TEMPLATE_ADMIN  = 'template_13qpqtt';     // template admin
  const TEMPLATE_CLIENT = 'template_9yctwor';     // template client

  // adresa ta de admin (folosită în template-ul de admin via {{to_email}})
  const ADMIN_EMAIL     = 'msahandmade.contact@gmail.com';

  if (window.emailjs && emailjs.init) { try{ emailjs.init(PUBLIC_KEY); }catch(_){} }

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
    if (b1) b1.textContent = count;
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
  const esc = (s)=> String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // === RENDER pe cos.html (dacă există containerul) ===
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
          <div class="cart-left"><img src="${p.image||'logo.png'}" alt="${esc(p.name||'')}"></div>
          <div class="cart-mid">
            <div class="name">${esc(p.name||'')}</div>
            <div class="price">${fmt(p.price)} RON</div>
            <div class="qty">
              <button data-act="dec" aria-label="Scade">−</button>
              <input type="number" min="1" value="${p.qty||1}">
              <button data-act="inc" aria-label="Crește">+</button>
              <button class="danger" data-act="del">Șterge</button>
            </div>
          </div>
        `;
        const input = card.querySelector('input');
        card.querySelector('[data-act="inc"]').onclick = ()=>{ input.value = Number(input.value||1)+1; input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="dec"]').onclick = ()=>{ input.value = Math.max(1, Number(input.value||1)-1); input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="del"]').onclick = ()=>{ removeFromCart(idx); render(); };
        input.addEventListener('change', ()=>{ setQty(idx, input.value); refreshTotals(); });
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

  // === PROFORMĂ HTML (injectată în mail) ===
  function makeProformaHTML(data, list, totals, orderId){
    const rows = list.map(i=>`
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(i.name||'')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${Number(i.qty)||1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt(i.price)} RON</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${fmt((Number(i.price)||0)*(Number(i.qty)||1))} RON</td>
      </tr>
    `).join('');

    return `
      <h3 style="margin:0 0 6px 0">Proformă #${orderId}</h3>
      <div style="color:#555">${new Date().toLocaleString('ro-RO')}</div>
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
      </table>`;
  }

  // === SUBMIT ORDER (apelată din cos.html) ===
  async function submitOrder(formElOrFormData) {
    const list = readCart();
    if (!list.length) throw new Error('Coș gol');

    const fd = (formElOrFormData instanceof FormData) ? formElOrFormData : new FormData(formElOrFormData);
    const data = Object.fromEntries(fd.entries());
    const totals = computeTotals(list);
    const orderId = Math.random().toString(36).slice(2,7).toUpperCase();

    // text produse pt admin
    const produseText = list.map(i =>
      `• ${i.name} x ${i.qty} = ${fmt((Number(i.price)||0)*(Number(i.qty)||1))} RON`
    ).join('\n');

    // html proformă
    const html_proforma = makeProformaHTML(data, list, totals, orderId);

    // Asigură EmailJS
    if (!window.emailjs) throw new Error('EmailJS indisponibil');

    // 1) Client (confirmare + proformă)
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, {
      to_email: data.email,         // << IMPORTANT
      order_id: orderId,
      nume: data.nume || '',
      html_proforma                 // << template must have {{{html_proforma}}}
    });

    // 2) Admin (detalii comandă)
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, {
      to_email: ADMIN_EMAIL,        // << IMPORTANT
      order_id: orderId,
      nume: `${data.nume||''} ${data.prenume||''}`,
      email: data.email||'',
      telefon: data.telefon||'',
      judet: data.judet||'',
      oras: data.oras||'',
      codpostal: data.codpostal||'',
      adresa: data.adresa||'',
      produse: produseText,
      subtotal: fmt(totals.subtotal),
      livrare: fmt(totals.shipping),
      total: fmt(totals.total),
      mentiuni: data.mentiuni || ''
    });

    clearCart();
    try{ window.location.href = 'multumesc.html'; }catch(_){}
    return true;
  }

  // === EXPOSE ===
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart, setQty,
    computeTotals, render, submitOrder,
    updateCartCountBadge
  };

  // auto init
  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartCountBadge();
    if (document.getElementById('items')) render();
  });
})();
