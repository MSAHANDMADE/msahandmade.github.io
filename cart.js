/* =========================================================
   MSA Handmade — Coș + Proformă + EmailJS (compat MSACart)
   ========================================================= */

/* -------- Chei EmailJS (cele pe care le-ai folosit) -------- */
const EMAILJS_SERVICE_ID   = 'service_ix0zpp7';
const EMAILJS_TEMPLATE_ADMIN  = 'template_13qpqtt'; // mesaj către magazin
const EMAILJS_TEMPLATE_CLIENT = 'template_9yctwor'; // confirmare client cu {{{html_proforma}}}
const EMAILJS_PUBLIC_KEY   = 'iSadfb7-TV_89l_6k';

/* -------- Date vânzător (apar pe PROFORMĂ) -------- */
const SELLER = {
  nameLine: 'STOICA MIHAELA – Persoană Fizică Autorizată (M.S.A Handmade Decor)',
  addr: 'jud. Ilfov, oraș Bragadiru, Str. Generalului, Nr. 10, Cam. 1, Bl. 1, Ap. 2',
  cui: 'CUI: 32196263',
  onrc: 'ONRC: F22/3299/2025',
  tva: 'Neplătitor de TVA',
  phone: '0747241246',
  email: 'msahandmade.contact@gmail.com'
};

/* -------- Setări reduceri + livrare -------- */
const LIVRARE_FIX = 20;           // RON
const LIVRARE_GRATUITA_DE_LA = 300; // RON
function calcReducere(sub) {
  if (sub >= 400) return 0.20;
  if (sub >= 300) return 0.15;
  if (sub >= 200) return 0.10;
  return 0;
}

/* -------- Utils -------- */
const LS_CART = 'MSA_CART';
const fmt = n => (Number(n)||0).toFixed(2) + ' RON';
const todayRO = () => new Date().toLocaleDateString('ro-RO');
const newOrderId = () => '#' + Math.floor(100000 + Math.random()*900000);

function readCart(){
  try {
    const raw = localStorage.getItem(LS_CART);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch(_) { return []; }
}
function writeCart(items){
  localStorage.setItem(LS_CART, JSON.stringify(items||[]));
  MSACart.updateCartCountBadge();
  window.dispatchEvent(new StorageEvent('storage',{key:LS_CART}));
}

/* =========================================================
   API PUBLIC compatibil cu vechiul tău cod: window.MSACart
   ========================================================= */
window.MSACart = window.MSACart || {};

/* Adaugă produs (compat: MSACart.addToCart(prod, qty)) */
MSACart.addToCart = function(prod, qty){
  const q = Math.max(1, Number(qty)||1);
  if (!prod || !prod.id) return;
  const items = readCart();
  const i = items.findIndex(x=>x.id===prod.id);
  if (i>-1) items[i].qty = (Number(items[i].qty)||1) + q;
  else items.push({ id:prod.id, name:prod.name||'', price:Number(prod.price)||0, image:prod.image||'', qty:q });
  writeCart(items);
};

/* Compat fallback (unele pagini vechi foloseau MSACart.add) */
MSACart.add = (p) => MSACart.addToCart(p, 1);

/* Numărul din bulina coșului din meniu */
MSACart.updateCartCountBadge = function(){
  try{
    const items = readCart();
    const cnt = items.reduce((s,it)=>s+(Number(it.qty)||0),0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = String(cnt);
  }catch(_){}
};

/* Expun și citirea coșului (folosită de unele pagini) */
MSACart.readCart = readCart;

/* Ștergere, qty, clear — folosite pe cos.html */
MSACart.removeAt = function(index){
  const items = readCart();
  items.splice(index,1);
  writeCart(items);
};
MSACart.setQtyAt = function(index, qty){
  const items = readCart();
  if (!items[index]) return;
  items[index].qty = Math.max(1, Number(qty)||1);
  writeCart(items);
};
MSACart.changeQtyAt = function(index, delta){
  const items = readCart();
  if (!items[index]) return;
  items[index].qty = Math.max(1, (Number(items[index].qty)||1) + delta);
  writeCart(items);
};
MSACart.clear = function(){
  writeCart([]);
};

/* =========================================================
   RENDER pe cos.html (folosește ID-urile tale existente)
   ========================================================= */
function renderCart(){
  const tbody  = document.getElementById('cart-body');
  if (!tbody) return; // nu suntem pe cos.html

  const subEl  = document.getElementById('subval') || document.getElementById('subtotalv');
  const disEl  = document.getElementById('discval')|| document.getElementById('discv');
  const shipEl = document.getElementById('shipval')|| document.getElementById('shipv');
  const totEl  = document.getElementById('totval') || document.getElementById('totalv');

  const items = readCart();

  if (!items.length){
    tbody.innerHTML = `<tr><td colspan="4" style="padding:16px;color:#64748b">Coșul este gol.</td></tr>`;
  } else {
    tbody.innerHTML = items.map((it,idx)=>`
      <tr>
        <td>
          <div style="display:flex;gap:12px;align-items:center;min-width:240px">
            <img src="${it.image||''}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px">
            <div>
              <div style="font-weight:700">${it.name||''}</div>
              <div style="color:#64748b;font-size:12px">${fmt(it.price)}</div>
            </div>
          </div>
        </td>
        <td style="min-width:170px">
          <div class="qty" style="display:inline-flex;align-items:center;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
            <button class="qminus" style="width:36px;height:36px;border:0;background:#f8fafc;font-size:18px">−</button>
            <input class="qinput" value="${Number(it.qty)||1}" style="width:52px;text-align:center;border:0;height:36px">
            <button class="qplus"  style="width:36px;height:36px;border:0;background:#f8fafc;font-size:18px">+</button>
          </div>
        </td>
        <td style="text-align:right"><strong>${fmt((it.price||0)*(it.qty||1))}</strong></td>
        <td style="text-align:right">
          <button class="rm" title="Șterge" style="width:36px;height:36px;border:0;border-radius:8px;background:#fee2e2;color:#991b1b">✕</button>
        </td>
      </tr>
    `).join('');

    // evenimente rând
    [...tbody.querySelectorAll('tr')].forEach((tr,idx)=>{
      tr.querySelector('.qminus').onclick = ()=>{ MSACart.changeQtyAt(idx,-1); renderCart(); };
      tr.querySelector('.qplus').onclick  = ()=>{ MSACart.changeQtyAt(idx, 1); renderCart(); };
      tr.querySelector('.qinput').onchange= (e)=>{ MSACart.setQtyAt(idx, e.target.value); renderCart(); };
      tr.querySelector('.rm').onclick     = ()=>{ MSACart.removeAt(idx); renderCart(); };
    });
  }

  // totaluri
  const subtotal = items.reduce((s,it)=>s+(Number(it.price)||0)*(Number(it.qty)||1),0);
  const r = calcReducere(subtotal);
  const reducere = +(subtotal * r).toFixed(2);
  const after = subtotal - reducere;
  const livrare = after >= LIVRARE_GRATUITA_DE_LA || subtotal===0 ? 0 : LIVRARE_FIX;
  const total = after + livrare;

  if (subEl)  subEl.textContent  = fmt(subtotal);
  if (disEl)  disEl.textContent  = '− ' + fmt(reducere);
  if (shipEl) shipEl.textContent = fmt(livrare);
  if (totEl)  totEl.textContent  = fmt(total);

  MSACart.updateCartCountBadge();
}

/* =========================================================
   PROFORMĂ (stânga vânzător, mijloc nr/data, dreapta client)
   ========================================================= */
function buildProformaHTML(order_id, when, client, items, breakdown){
  const rows = items.map(it=>`
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb">${it.name}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${Number(it.qty)||1}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(it.price)}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>${fmt((it.price||0)*(it.qty||1))}</strong></td>
    </tr>
  `).join('');

  const clientTitle = client.tip==='pj' ? 'Cumpărător (PJ)' : 'Cumpărător (PF)';

  const header = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;color:#0f172a">
      <tr>
        <!-- STÂNGA: Vânzător -->
        <td width="34%" style="vertical-align:top;border:1px solid #e5e7eb;border-radius:12px;padding:12px">
          <div style="font-weight:700;margin-bottom:6px">Vânzător</div>
          <div><strong>${SELLER.nameLine}</strong></div>
          <div>${SELLER.addr}</div>
          <div>${SELLER.cui} · ${SELLER.onrc} · ${SELLER.tva}</div>
          <div>Tel: ${SELLER.phone} · Email: ${SELLER.email}</div>
        </td>

        <!-- MIJLOC: Nr + Data -->
        <td width="32%" align="center" style="vertical-align:top;padding:0 10px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px">
            <tr><td style="padding:12px;text-align:center">
              <div style="display:inline-block;padding:4px 10px;border:1px solid #a5f3fc;background:#ecfeff;color:#0e7490;border-radius:999px;font-size:12px;margin-bottom:8px">Proformă</div>
              <div style="font-size:22px;font-weight:800;margin-bottom:6px">MSA Handmade</div>
              <div style="color:#475569;margin-bottom:2px">Nr. comandă: <strong>${order_id}</strong></div>
              <div style="color:#475569">Data: <strong>${when}</strong></div>
            </td></tr>
          </table>
        </td>

        <!-- DREAPTA: Client -->
        <td width="34%" style="vertical-align:top;border:1px solid #e5e7eb;border-radius:12px;padding:12px">
          <div style="font-weight:700;margin-bottom:6px">${clientTitle}</div>
          ${ client.firma ? `<div><strong>${client.firma}</strong></div>` : '' }
          <div>${client.nume||''} ${client.prenume||''}</div>
          ${ client.cui ? `<div>CUI: ${client.cui}${client.reg ? ' · Reg. Com.: '+client.reg : ''}</div>` : '' }
          <div>${client.adresa||''}, ${client.oras||''}, ${client.judet||''}, ${client.codpostal||''}</div>
          <div>Tel: ${client.telefon||''} · Email: ${client.email||''}</div>
        </td>
      </tr>
    </table>
  `;

  return `
    ${header}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px;border-collapse:collapse;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th align="left"  style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700">Produs</th>
          <th align="right" style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700">Cant.</th>
          <th align="right" style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700">Preț</th>
          <th align="right" style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:700">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" align="right" style="padding:10px;border-top:2px solid #e5e7eb;font-weight:700">Subtotal</td>
          <td align="right" style="padding:10px;border-top:2px solid #e5e7eb;font-weight:700">${fmt(breakdown.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3" align="right" style="padding:10px;font-weight:700">Reducere</td>
          <td align="right" style="padding:10px;font-weight:700">− ${fmt(breakdown.reducere)}</td>
        </tr>
        <tr>
          <td colspan="3" align="right" style="padding:10px;font-weight:700">Livrare</td>
          <td align="right" style="padding:10px;font-weight:700">${fmt(breakdown.livrare)}</td>
        </tr>
        <tr>
          <td colspan="3" align="right" style="padding:10px;font-size:20px;font-weight:800">Total</td>
          <td align="right" style="padding:10px;font-size:20px;font-weight:800">${fmt(breakdown.total)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="color:#64748b;margin-top:12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif">
      Proforma nu este document fiscal. ${SELLER.tva}.
    </div>
  `;
}

/* =========================================================
   SUBMIT COMANDĂ (trimite email admin + client)
   ========================================================= */
async function handleOrderSubmit(e){
  e.preventDefault();

  const items = readCart();
  if (!items.length){ alert('Coșul este gol.'); return; }

  // citește formularul (PF/PJ)
  const f = e.target;
  const fd = new FormData(f);
  const tip = (fd.get('tip')||'pf').toString();

  const client = {
    tip,
    nume: fd.get('nume')?.toString()||'',
    prenume: fd.get('prenume')?.toString()||'',
    email: fd.get('email')?.toString()||'',
    telefon: fd.get('telefon')?.toString()||'',
    judet: fd.get('judet')?.toString()||'',
    oras: fd.get('oras')?.toString()||'',
    adresa: fd.get('adresa')?.toString()||'',
    codpostal: fd.get('codpostal')?.toString()||'',
    mentiuni: fd.get('mentiuni')?.toString()||'',
    firma: tip==='pj' ? (fd.get('firma')?.toString()||'') : '',
    cui:   tip==='pj' ? (fd.get('cui')?.toString()||'')   : '',
    reg:   tip==='pj' ? (fd.get('reg')?.toString()||'')   : ''
  };

  if (!client.email) { alert('Te rugăm să completezi emailul.'); return; }

  // totaluri
  const subtotal = items.reduce((s,it)=>s+(Number(it.price)||0)*(Number(it.qty)||1),0);
  const r = calcReducere(subtotal);
  const reducere = +(subtotal * r).toFixed(2);
  const after = subtotal - reducere;
  const livrare = after >= LIVRARE_GRATUITA_DE_LA ? 0 : LIVRARE_FIX;
  const total = after + livrare;
  const breakdown = {subtotal, reducere, livrare, total};

  const order_id = newOrderId();
  const when = todayRO();

  // HTML proformă pentru client
  const html_proforma = buildProformaHTML(order_id, when, client, items, breakdown);

  // listă textuală pentru email admin
  const produseText = items.map(it => `• ${it.name} × ${it.qty} = ${(it.price*it.qty).toFixed(2)} RON`).join('\n')
    + `\n\nSubtotal: ${subtotal.toFixed(2)} RON\nReducere: -${reducere.toFixed(2)} RON\nLivrare: ${livrare.toFixed(2)} RON\nTOTAL: ${total.toFixed(2)} RON`;

  // blochează butonul ca să nu trimită de 5 ori
  const submitBtn = f.querySelector('button[type="submit"]');
  if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Se trimite…'; }

  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // 1) către MAGAZIN (admin)
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN, {
      tip: client.tip.toUpperCase(),
      nume: client.nume,
      prenume: client.prenume,
      email: client.email,
      telefon: client.telefon,
      judet: client.judet,
      oras: client.oras,
      codpostal: client.codpostal,
      adresa: client.adresa,
      produse: produseText,
      order_id: order_id,
      mentiuni: client.mentiuni || ''
    });

    // 2) către CLIENT (confirmare + proformă)
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, {
      to_email: client.email,
      nume: client.tip==='pj' ? (client.firma||client.nume) : client.nume,
      order_id: order_id,
      html_proforma: html_proforma
    });

    alert('Comanda a fost trimisă! Ai primit confirmarea pe email.');
    MSACart.clear();
    // redirect opțional:
    if (window.location.pathname.indexOf('cos')>-1) window.location.href = 'multumesc.html';
  } catch (err) {
    console.error('EmailJS error:', err);
    alert('A apărut o eroare la trimiterea comenzii. Verifică conexiunea și cheile EmailJS.');
  } finally {
    if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Plasează comanda'; }
    renderCart();
  }
}

/* =========================================================
   INIT (badge + render + legături butoane)
   ========================================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  MSACart.updateCartCountBadge();
  window.addEventListener('storage', (e)=>{ if (e.key===LS_CART) MSACart.updateCartCountBadge(); });

  renderCart();

  // buton „Golește coșul”
  const btnClear = document.getElementById('clear-cart');
  if (btnClear) btnClear.onclick = ()=>{ MSACart.clear(); renderCart(); };

  // toggle PF/PJ (dacă ai radiourile pe cos.html)
  const radios = document.querySelectorAll('input[name="tip"]');
  if (radios.length){
    const sync = ()=>{
      const pj = document.querySelector('input[name="tip"]:checked')?.value==='pj';
      document.querySelectorAll('.pj-only').forEach(el=> el.style.display = pj ? '' : 'none');
      document.querySelectorAll('.pf-only').forEach(el=> el.style.display = pj ? 'none' : '');
    };
    radios.forEach(r=> r.addEventListener('change', sync));
    sync();
  }

  // submit formular (dacă există)
  const form = document.getElementById('order-form') || document.getElementById('checkout-form');
  if (form) form.addEventListener('submit', handleOrderSubmit);
});
