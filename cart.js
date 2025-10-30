/* MSA Handmade — Coș complet: PF/PJ, reduceri, livrare, proformă, EmailJS, anti-dublu */
(function () {
  // === CONFIG ===
  const STORAGE_KEY   = 'msa_cart';
  const SHIPPING_BASE = 17; // sub 300 RON

  // EmailJS (cheile tale confirmate)
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt';  // către admin
  const TEMPLATE_CLIENT = 'template_9yctwor';  // către client
  const ADMIN_EMAIL     = 'msahandmade.contact@gmail.com';

  if (window.emailjs && typeof emailjs.init === 'function') {
    try { emailjs.init(PUBLIC_KEY); } catch(e){}
  }

  // === UTILS ===
  const fmt = n => (Number(n)||0).toFixed(2);
  const esc = s => String(s||'')
     .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
     .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  async function sha256(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  // === STORAGE ===
  const readCart = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; } };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list||[]));

  // === BADGE ===
  function updateCartCountBadge(){
    const list = readCart();
    const count = list.reduce((s,i)=>s+(parseInt(i.qty)||1),0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CRUD ===
  function addToCart({id,name,price,image}){
    if (!id) return;
    const list = readCart();
    const idx = list.findIndex(p=>p.id===id);
    price = Number(price)||0;
    if (idx>-1) list[idx].qty = (parseInt(list[idx].qty)||1)+1;
    else list.push({id, name:name||'', price, image:image||'', qty:1});
    saveCart(list);
    updateCartCountBadge();
  }
  function removeFromCart(indexOrId){
    const list = readCart();
    const idx = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1){ list.splice(idx,1); saveCart(list); updateCartCountBadge(); }
  }
  function clearCart(){ saveCart([]); updateCartCountBadge(); }
  function setQty(indexOrId, v){
    const list = readCart();
    const idx = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1){ list[idx].qty = Math.max(1, Number(v)||1); saveCart(list); updateCartCountBadge(); }
  }

  // === TOTALURI (reguli confirmate) ===
  function computeTotals(list){
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
    let pct = 0, shipping = SHIPPING_BASE;

    if (subtotal >= 400) { pct = 20; shipping = 0; }
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) { pct = 10; }

    const discount = +(subtotal * pct / 100).toFixed(2);
    const total = +((subtotal - discount + shipping)).toFixed(2);
    return { subtotal:+subtotal.toFixed(2), discount, shipping:+shipping.toFixed(2), total, pct };
  }

  // === RENDER în tabel ===
  function money(n){ return fmt(n) + ' RON'; }

  function render(){
    const body = document.getElementById('cart-body');
    if (!body) return;

    const items = readCart();
    if (!items.length){
      body.innerHTML = '<tr><td colspan="5">Coșul este gol.</td></tr>';
    } else {
      body.innerHTML = items.map((i,idx)=>{
        const line = (Number(i.price)||0) * (Number(i.qty)||1);
        return `
          <tr data-idx="${idx}">
            <td>
              <div style="display:flex; gap:10px; align-items:center">
                <img src="${i.image||''}" alt="${esc(i.name||'')}">
                <div>
                  <div style="font-weight:600">${esc(i.name||'')}</div>
                </div>
              </div>
            </td>
            <td>${money(i.price)}</td>
            <td>
              <div class="qty">
                <button type="button" class="qminus">−</button>
                <input type="number" class="qinput" min="1" value="${i.qty||1}">
                <button type="button" class="qplus">+</button>
              </div>
            </td>
            <td><b>${money(line)}</b></td>
            <td><button class="remove" type="button" aria-label="Șterge">✕</button></td>
          </tr>
        `;
      }).join('');
    }
    bindRowEvents();
    refreshTotals();
    updateCartCountBadge();
  }

  function bindRowEvents(){
    document.querySelectorAll('#cart-body tr').forEach(tr=>{
      const idx = Number(tr.getAttribute('data-idx'));
      const input = tr.querySelector('.qinput');

      tr.querySelector('.qminus')?.addEventListener('click', ()=>{
        input.value = Math.max(1, (parseInt(input.value)||1)-1);
        setQty(idx, input.value); render();
      });
      tr.querySelector('.qplus')?.addEventListener('click', ()=>{
        input.value = (parseInt(input.value)||1)+1;
        setQty(idx, input.value); render();
      });
      input?.addEventListener('change', (e)=>{
        const v = Math.max(1, parseInt(e.target.value)||1);
        setQty(idx, v); render();
      });
      tr.querySelector('.remove')?.addEventListener('click', ()=>{
        removeFromCart(idx); render();
      });
    });
  }

  function refreshTotals(){
    const t = computeTotals(readCart());
    const put = (id,val)=>{ const el=document.getElementById(id); if (el) el.textContent = val; };
    put('t-sub',   money(t.subtotal));
    put('t-disc',  money(t.discount));
    put('t-ship',  money(t.shipping));
    put('t-total', money(t.total));
  }

  // === PROFORMĂ HTML (trimisă clientului)
  function makeProformaHTML(data, list, totals, orderId){
    const firma = {
      denumire:'Stoica Mihaela – Persoană Fizică Autorizată',
      cui:'52197623',
      regcom:'F2025026596007',
      adresa:'Str. Generalului nr. 10, Bl. 1, Sc. 1, Ap. 2, Bragadiru, IF',
      iban:'RO71 ROIN 4021 V44X 12E1 65BQ',
      banca:'Salt Bank'
    };

    const rows = list.map(i=>{
      const line = (Number(i.price)||0)*(Number(i.qty)||1);
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eee">${esc(i.name||'')}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center">${Number(i.qty)||1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(i.price)} RON</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(line)} RON</td>
        </tr>`;
    }).join('');

    const clientPF = `
      <div style="line-height:1.5">
        <div style="font-weight:700;margin-bottom:4px">Client (PF)</div>
        <div>${esc(data.nume)} ${esc(data.prenume)}</div>
        <div>Email: <a href="mailto:${esc(data.email)}" style="color:#0b62">${esc(data.email)}</a></div>
        <div>Tel: ${esc(data.telefon||'')}</div>
        <div>Adresă: ${esc(data.adresa||'')}, ${esc(data.oras||'')}, ${esc(data.judet||'')} ${esc(data.codpostal||'')}</div>
      </div>`;

    const clientPJ = `
      <div style="line-height:1.5">
        <div style="font-weight:700;margin-bottom:4px">Client (PJ)</div>
        <div>${esc(data.firma||'')}</div>
        <div>CUI: ${esc(data.cui||'')} · Reg. Com.: ${esc(data.regcom||'')}</div>
        <div>Persoană de contact: ${esc(data.nume)} ${esc(data.prenume)}</div>
        <div>Email: <a href="mailto:${esc(data.email)}" style="color:#0b62">${esc(data.email)}</a></div>
        <div>Tel: ${esc(data.telefon||'')}</div>
        <div>Adresă: ${esc(data.adresa||'')}, ${esc(data.oras||'')}, ${esc(data.judet||'')} ${esc(data.codpostal||'')}</div>
      </div>`;

    const clientBlock = (data.tip === 'Persoană juridică') ? clientPJ : clientPF;

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

  // === TRIMITERE COMANDĂ (anti-dublu + diag + redirect)
  let SENDING = false;

  async function submitOrder(formEl){
    const list = readCart();
    if (!list.length){ alert('Coșul este gol.'); return false; }

    const fd = new FormData(formEl);
    const data = Object.fromEntries(fd.entries());

    // validări minime
    if (!data.email || !/^[^@]+@[^@]+\.[^@]+$/.test(data.email)) {
      alert('Te rugăm să introduci un email valid.');
      return false;
    }

    if (SENDING) return false;
    SENDING = true;

    const totals    = computeTotals(list);
    const signature = await sha256(JSON.stringify({ list, email:data.email||'', totals }));
    const lastSig   = localStorage.getItem('msa_last_order_sig');
    const lastTs    = Number(localStorage.getItem('msa_last_order_ts')||0);
    const now       = Date.now();

    if (lastSig === signature && now - lastTs < 10*60*1000) {
      try { window.location.href = 'multumesc.html'; } catch(_) {}
      SENDING = false; return false;
    }
    localStorage.setItem('msa_last_order_sig', signature);
    localStorage.setItem('msa_last_order_ts', String(now));

    const orderId = Math.random().toString(36).slice(2,7).toUpperCase();
    const html_proforma = makeProformaHTML(data, list, totals, orderId);
    const produseText = list.map(i => `• ${i.name} x ${i.qty} = ${fmt((+i.price||0)*(+i.qty||1))} RON`).join('\n');

    const explain = (err) => {
      let msg = 'A apărut o eroare la trimitere.';
      if (err && (err.text || err.message)) msg += `\n\nDetalii: ${err.text || err.message}`;
      msg += '\n\nVerifică în EmailJS:'
           + '\n• Public Key / Service ID / Template ID'
           + '\n• Domeniul „https://www.msahandmade.ro” la „Domains”'
           + '\n• Variabilele necesare din template (to_email, order_id, nume, html_proforma etc.)';
      alert(msg);
      console.error('EmailJS error:', err);
    };

    try{
      if (!window.emailjs) throw new Error('EmailJS nu este încărcat.');

      // CLIENT: proformă
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, {
        to_email: data.email || '',
        order_id: orderId,
        nume: (data.nume || '') + ' ' + (data.prenume || ''),
        html_proforma,
      });

      // ADMIN: rezumat complet
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
        firma: data.firma || '',
        cui: data.cui || '',
        regcom: data.regcom || '',
        mentiuni: data.mentiuni || '',
        produse: produseText,
        subtotal: fmt(totals.subtotal),
        livrare: fmt(totals.shipping),
        reducere_pct: String(totals.pct||0),
        reducere: fmt(totals.discount),
        total: fmt(totals.total)
      });

      clearCart();
      try { window.location.href = 'multumesc.html'; } catch(_){}
      return true;
    }catch(err){
      localStorage.removeItem('msa_last_order_sig');
      localStorage.removeItem('msa_last_order_ts');
      SENDING = false;
      explain(err);
      return false;
    }
  }

  function hookCheckout(formSel='#checkout-form', btnSel='#place-order'){
    const form = document.querySelector(formSel);
    const btn  = document.querySelector(btnSel);
    if (!form) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const old = btn ? btn.textContent : '';
      if (btn){ btn.disabled = true; btn.textContent = 'Se trimite…'; }
      const ok = await submitOrder(form);
      if (!ok && btn){ btn.disabled = false; btn.textContent = old || 'Confirmă comanda'; }
    });
  }

  // === EXPOSE + INIT ===
  window.MSACart = {
    readCart, saveCart, addToCart, removeFromCart, clearCart, setQty,
    computeTotals, render, hookCheckout, updateCartCountBadge
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartCountBadge();
    if (document.getElementById('cart-body')) render();
  });
})();
