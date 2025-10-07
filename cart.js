/* MSA Handmade — coș + reduceri + EmailJS + proformă */
(function(){
  // === CONFIG ===
  const STORAGE_KEY   = 'msa_cart';
  const SHIPPING_BASE = 17;

  // EmailJS
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt'; // către tine
  const TEMPLATE_CLIENT = 'template_9yctwor'; // către client (folosește {{{html_proforma}}})

  if (window.emailjs && typeof emailjs.init==='function'){ try{ emailjs.init(PUBLIC_KEY); }catch(e){} }

  // === STORAGE ===
  const readCart = ()=>{ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }catch{return [];} };
  const saveCart = (list)=> localStorage.setItem(STORAGE_KEY, JSON.stringify(list||[]));

  // === BADGE ===
  function updateCartCountBadge(){
    const list  = readCart();
    const count = list.reduce((s,i)=> s+(parseInt(i.qty)||1), 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
  }

  // === CRUD ===
  function addToCart({id,name,price,image}){
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p=>p.id===id);
    if (i>-1) list[i].qty = (parseInt(list[i].qty)||1)+1;
    else list.push({id, name:name||'', price:Number(price)||0, image:image||'', qty:1});
    saveCart(list); updateCartCountBadge();
  }
  function removeFromCart(index){
    const list = readCart();
    if (index>-1){ list.splice(index,1); saveCart(list); updateCartCountBadge(); }
  }
  function clearCart(){ saveCart([]); updateCartCountBadge(); }
  function setQty(index,v){
    const list = readCart();
    if (!list[index]) return;
    list[index].qty = Math.max(1, Number(v)||1);
    saveCart(list); updateCartCountBadge();
  }

  // === TOTALS ===
  function computeTotals(list){
    const subtotal = list.reduce((s,i)=> s+(Number(i.price)||0)*(Number(i.qty)||1), 0);
    let pct=0, shipping = SHIPPING_BASE;
    if (subtotal>=400) pct=20;
    else if (subtotal>=300){ pct=15; shipping=0; }
    else if (subtotal>=200) pct=10;
    const discount = +(subtotal*pct/100).toFixed(2);
    const total = +((subtotal-discount+shipping)).toFixed(2);
    return {subtotal:+subtotal.toFixed(2), discount, shipping:+shipping.toFixed(2), total, pct};
  }
  const fmt = (n)=> (Number(n)||0).toFixed(2);

  // === RENDER (cos.html) ===
  function render(){
    const mount = document.getElementById('items');
    if (!mount) return;
    const list = readCart();
    mount.innerHTML = '';
    if (!list.length){ mount.innerHTML = '<p>Coșul tău este gol.</p>'; refreshTotals(); return; }

    list.forEach((p,idx)=>{
      const row = document.createElement('div');
      row.className = 'cart-card';
      row.innerHTML = `
        <img src="${p.image||'logo.png'}" alt="${p.name||''}">
        <div class="cart-mid">
          <div style="font-weight:700">${p.name||''}</div>
          <div style="color:#444">${fmt(p.price)} RON</div>
          <div class="qty">
            <button data-act="dec">−</button>
            <input type="number" min="1" value="${p.qty||1}">
            <button data-act="inc">+</button>
            <button class="danger" data-act="del">Șterge</button>
          </div>
        </div>`;
      const input = row.querySelector('input');
      row.querySelector('[data-act="inc"]').onclick = ()=>{ input.value=Number(input.value||1)+1; input.dispatchEvent(new Event('change')); };
      row.querySelector('[data-act="dec"]').onclick = ()=>{ input.value=Math.max(1, Number(input.value||1)-1); input.dispatchEvent(new Event('change')); };
      row.querySelector('[data-act="del"]').onclick = ()=>{ removeFromCart(idx); render(); };
      input.addEventListener('change', ()=>{ setQty(idx,input.value); refreshTotals(); });
      mount.appendChild(row);
    });
    refreshTotals();
  }

  function refreshTotals(){
    const t = computeTotals(readCart());
    const put = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    put('subtot', fmt(t.subtotal)); put('disc', fmt(t.discount));
    put('ship', fmt(t.shipping));   put('grand', fmt(t.total));
    updateCartCountBadge();
  }

  // === PROFORMA (HTML) ===
  function makeProformaHTML(data, list, totals, orderId){
    const firma = {
      denumire:'Stoica Mihaela – Persoană Fizică Autorizată',
      cui:'52197623', regcom:'F2025026596007',
      adresa:'Str. Generalului nr. 10, Bl. 1, Sc. 1, Ap. 2, Bragadiru, IF',
      iban:'RO71 ROIN 4021 V44X 12E1 65BQ', banca:'Salt Bank'
    };
    const client = (()=>{
      if ((data.tip||'')==='Persoană juridică'){
        return `<div><strong>Client (PJ)</strong></div>
        <div>${esc(data.firma||'')}</div>
        <div>CUI: ${esc(data.cui||'')}</div>
        <div>Reg. Com.: ${esc(data.regcom||'')}</div>
        <div>Persoană de contact: ${esc(data.nume||'')} ${esc(data.prenume||'')}</div>
        <div>Email: ${esc(data.email||'')} · Tel: ${esc(data.telefon||'')}</div>
        <div>Adresă: ${esc(data.adresa||'')}, ${esc(data.oras||'')}, ${esc(data.judet||'')} ${esc(data.codpostal||'')}</div>`;
      }
      return `<div><strong>Client (PF)</strong></div>
      <div>${esc(data.nume||'')} ${esc(data.prenume||'')}</div>
      <div>Email: ${esc(data.email||'')} · Tel: ${esc(data.telefon||'')}</div>
      <div>Adresă: ${esc(data.adresa||'')}, ${esc(data.oras||'')}, ${esc(data.judet||'')} ${esc(data.codpostal||'')}</div>`;
    })();
    const rows = list.map(i=>`
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(i.name||'')}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${Number(i.qty)||1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(i.price)} RON</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt((Number(i.price)||0)*(Number(i.qty)||1))} RON</td>
      </tr>`).join('');
    return `
    <div style="font-family:ui-sans-serif,-apple-system,Segoe UI,Roboto,Arial;max-width:720px;margin:18px auto;padding:16px;border:1px solid #eee;border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <h3 style="margin:0 0 6px">MSA Handmade</h3>
          <div style="color:#666">${firma.denumire}<br>CUI: ${firma.cui} · Reg. Com.: ${firma.regcom}<br>IBAN: ${firma.iban} · ${firma.banca}<br>${firma.adresa}</div>
        </div>
        <div style="text-align:right">
          <div><strong>Proformă:</strong> #${orderId}</div>
          <div style="color:#666">${new Date().toLocaleString('ro-RO')}</div>
        </div>
      </div>
      <div style="margin:10px 0">${client}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <thead><tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #222">Produs</th>
          <th style="text-align:center;padding:8px;border-bottom:2px solid #222">Cant.</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #222">Preț</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #222">Total</th>
        </tr></thead>
        <tbody>${rows||'<tr><td colspan="4" style="padding:8px">—</td></tr>'}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right;padding:6px 8px">Subtotal</td><td style="text-align:right;padding:6px 8px">${fmt(totals.subtotal)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:6px 8px">Reducere ${totals.pct||0}%</td><td style="text-align:right;padding:6px 8px">− ${fmt(totals.discount)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:6px 8px">Livrare</td><td style="text-align:right;padding:6px 8px">${fmt(totals.shipping)} RON</td></tr>
          <tr><td colspan="3" style="text-align:right;padding:10px 8px;font-weight:700;border-top:2px solid #222">TOTAL</td><td style="text-align:right;padding:10px 8px;font-weight:700;border-top:2px solid #222">${fmt(totals.total)} RON</td></tr>
        </tfoot>
      </table>
      <div style="margin-top:10px;color:#666;font-size:12px">* Proforma nu ține loc de factură. Factura fiscală va fi emisă la expediere.</div>
    </div>`;
  }
  const esc = (s)=> String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // === SUBMIT ORDER ===
  async function submitOrder(formDataOrEl){
    const list = readCart();
    if (!list.length) throw new Error('empty');
    const fd = (formDataOrEl instanceof FormData) ? formDataOrEl : new FormData(formDataOrEl);
    const data = Object.fromEntries(fd.entries());
    const totals = computeTotals(list);
    const orderId = Math.random().toString(36).slice(2,7).toUpperCase();

    try{ localStorage.setItem('msa_last_order', JSON.stringify({id:orderId, ts:Date.now(), list, totals, data})); }catch{}

    const produseText = list.map(i=>`• ${i.name} x ${i.qty} = ${fmt((+i.price||0)*(+i.qty||1))} RON`).join('\n');
    const html_proforma = makeProformaHTML(data, list, totals, orderId);

    if (!window.emailjs) throw new Error('emailjs-missing');

    // CLIENT — asigură-te că în EmailJS, "To" este {{to_email}}
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, {
      to_email: data.email || '',
      nume: data.nume || '',
      order_id: orderId,
      html_proforma
    });

    // ADMIN — fie "To" fix în template, fie folosim {{to_email}} aici
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, {
      to_email: 'msahandmade.contact@gmail.com',
      order_id: orderId,
      nume: data.nume || '',
      produse: produseText,
      subtotal: fmt(totals.subtotal),
      livrare: fmt(totals.shipping),
      total: fmt(totals.total),
      mentiuni: data.mentiuni || ''
    });

    clearCart();
    try{ window.location.href = 'multumesc.html'; }catch{}
    return true;
  }

  // === API global ===
  window.MSACart = {
    readCart, saveCart, addToCart, removeFromCart, clearCart, setQty,
    computeTotals, render, submitOrder, updateCartCountBadge
  };

  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
