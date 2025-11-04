<script>
// =====================
// Config general
// =====================
const LS_KEY = 'MSA_CART';
const SHIP_COST = 20;               // livrare standard
const DISCOUNTS = [                 // praguri reduceri
  { min: 400, pct: 20 },
  { min: 300, pct: 15 },
  { min: 200, pct: 10 },
];

// EmailJS
const EMAILJS_SERVICE   = 'service_ix0zpp7';
const EMAILJS_TPL_ADMIN = 'template_13qpqtt';   // Contact/Comandă către admin
const EMAILJS_TPL_CLIENT= 'template_9yctwor';   // Confirmare către client
emailjs.init('YOUR_PUBLIC_KEY_IF_NEEDED');      // dacă nu e necesar, poți lăsa așa

// =====================
// Utilitare
// =====================
const fmt = n => (Number(n)||0).toFixed(2) + ' RON';
const load = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
};
const save = (items) => localStorage.setItem(LS_KEY, JSON.stringify(items));
const uid = () => String(Math.floor(Math.random()*900000)+100000);

// =====================
// Coș (API simplu)
// =====================
const Cart = {
  list() { return load(); },
  add(prod) {
    const items = load();
    const i = items.findIndex(p => p.id === prod.id);
    if (i>-1) items[i].qty += prod.qty||1;
    else items.push({...prod, qty: prod.qty||1});
    save(items); badge(); 
  },
  remove(id) {
    save(load().filter(p => p.id !== id)); badge();
  },
  setQty(id, qty) {
    const items = load().map(p => p.id===id ? {...p, qty: Math.max(1, Number(qty)||1)} : p);
    save(items); badge();
  },
  changeQty(id, delta) {
    const items = load().map(p => p.id===id ? {...p, qty: Math.max(1, p.qty + delta)} : p);
    save(items); badge();
  },
  clear() { save([]); badge();},
  totals() {
    const items = load();
    const subtotal = items.reduce((s,p)=> s + p.price*p.qty, 0);
    const discPct = (DISCOUNTS.find(d=> subtotal>=d.min) || {pct:0}).pct;
    const reducere = subtotal * discPct/100;
    const livrare = subtotal>=300 ? 0 : (items.length? SHIP_COST:0);
    const total = subtotal - reducere + livrare;
    return {subtotal, reducere, livrare, total, discPct};
  }
};

// =====================
// Badge coș (icon meniul de sus)
// =====================
function badge(){
  try{
    const el = document.getElementById('cart-count');
    if (!el) return;
    const c = load().reduce((s,p)=>s+p.qty,0);
    el.textContent = c;
  }catch{}
}
window.addEventListener('storage', (e)=>{ if(e.key===LS_KEY) badge(); });

// =====================
// PROFORMA (HTML pentru email) – CU DATELE TALE
// =====================
function buildProformaHTML(orderId, form, items, totals){
  // vânzător (PFA) – completat FIX în HTML
  const SELLER = {
    name: 'STOICA MIHAELA – Persoană Fizică Autorizată',
    cui: 'ROONRC: F2020/5696/007 (ex. număr ONRC de pe certificat)',
    reg: 'Cod unic de înregistrare: 32191623',
    sediu: 'Str. Generalului, Nr. 10, Cam. 1, Bl. 1, Ap. 2, Bragadiru, Ilfov',
    email: 'msahandmade.contact@gmail.com',
    tel: '0747 241 246',
    tva: 'Neplătitor de TVA'
  };

  const today = new Date();
  const dstr = today.toLocaleDateString('ro-RO');

  const rows = items.map(p=>`
    <tr>
      <td>${p.name}</td>
      <td style="text-align:center;">${p.qty}</td>
      <td style="text-align:right;">${fmt(p.price)}</td>
      <td style="text-align:right;">${fmt(p.price*p.qty)}</td>
    </tr>
  `).join('');

  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:760px;margin:auto;color:#0f172a">
    <!-- antet 3 coloane -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr>
        <td style="width:33%;vertical-align:top;padding:8px;border:1px solid #e2e8f0;border-right:none">
          <div style="font-weight:700;margin-bottom:4px">Vânzător</div>
          <div>${SELLER.name}</div>
          <div>${SELLER.sediu}</div>
          <div>${SELLER.reg}</div>
          <div>${SELLER.cui}</div>
          <div>${SELLER.tva}</div>
          <div>Tel: ${SELLER.tel}</div>
          <div>Email: ${SELLER.email}</div>
        </td>
        <td style="width:34%;text-align:center;vertical-align:top;padding:8px;border:1px solid #e2e8f0;border-right:none;border-left:none">
          <div style="font-size:20px;font-weight:800;">PROFORMĂ</div>
          <div style="margin-top:6px">Nr. comandă: <strong>#${orderId}</strong></div>
          <div>Data: <strong>${dstr}</strong></div>
        </td>
        <td style="width:33%;vertical-align:top;padding:8px;border:1px solid #e2e8f0;border-left:none">
          <div style="font-weight:700;margin-bottom:4px">Client</div>
          <div>${form.tip === 'pj'
              ? (form.firma || '(Denumire firmă)')
              : `${form.nume||''} ${form.prenume||''}`.trim()}</div>
          ${form.tip === 'pj' ? `<div>CUI: ${form.cui||'-'} • Nr. Reg.: ${form.regcom||'-'}</div>`:''}
          <div>${form.adresa||''}, ${form.oras||''}, ${form.judet||''}, ${form.codpostal||''}</div>
          <div>Tel: ${form.telefon||''}</div>
          <div>Email: ${form.email||''}</div>
        </td>
      </tr>
    </table>

    <!-- tabel produse -->
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="text-align:left;padding:10px;border:1px solid #e2e8f0">Produs</th>
          <th style="text-align:center;padding:10px;border:1px solid #e2e8f0">Cant.</th>
          <th style="text-align:right;padding:10px;border:1px solid #e2e8f0">Preț</th>
          <th style="text-align:right;padding:10px;border:1px solid #e2e8f0">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;padding:8px;border:1px solid #e2e8f0"><strong>Subtotal</strong></td>
          <td style="text-align:right;padding:8px;border:1px solid #e2e8f0">${fmt(totals.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;padding:8px;border:1px solid #e2e8f0">Reducere ${totals.discPct?`(${totals.discPct}%)`:''}</td>
          <td style="text-align:right;padding:8px;border:1px solid #e2e8f0">− ${fmt(totals.reducere)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;padding:8px;border:1px solid #e2e8f0">Livrare</td>
          <td style="text-align:right;padding:8px;border:1px solid #e2e8f0">${fmt(totals.livrare)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;padding:12px;border:1px solid #e2e8f0;font-size:18px"><strong>Total</strong></td>
          <td style="text-align:right;padding:12px;border:1px solid #e2e8f0;font-size:18px"><strong>${fmt(totals.total)}</strong></td>
        </tr>
      </tfoot>
    </table>

    <p style="margin-top:16px;color:#475569;font-size:12px">
      Plata se face ramburs la livrare. Document nefiscal. (PFA – neplătitor de TVA)
    </p>
  </div>`;
}

// =====================
// Render pe cos.html (dacă există elementele)
// =====================
document.addEventListener('DOMContentLoaded', () => {
  badge();

  const tbody   = document.getElementById('cart-body');
  if (!tbody) return; // nu suntem pe cos.html

  const subEl   = document.getElementById('subval');
  const discEl  = document.getElementById('discval');
  const shipEl  = document.getElementById('shipval');
  const totEl   = document.getElementById('totval');

  const btnClear= document.getElementById('clear-cart');
  if (btnClear) btnClear.onclick = ()=>{ Cart.clear(); render(); };

  function row(p){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${p.image||'images/placeholder.jpg'}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px">
          <div>
            <div style="font-weight:600">${p.name}</div>
            <div style="color:#64748b;font-size:12px">${fmt(p.price)}</div>
          </div>
        </div>
      </td>
      <td style="width:180px">
        <div class="qty">
          <button type="button" class="minus" aria-label="minus">–</button>
          <input type="number" min="1" value="${p.qty}">
          <button type="button" class="plus" aria-label="plus">+</button>
        </div>
      </td>
      <td style="text-align:right;font-weight:700">${fmt(p.price*p.qty)}</td>
      <td style="width:56px;text-align:right">
        <button type="button" class="remove" title="Șterge">✕</button>
      </td>
    `;
    tr.querySelector('.minus').onclick = ()=>{ Cart.changeQty(p.id,-1); render(); };
    tr.querySelector('.plus').onclick  = ()=>{ Cart.changeQty(p.id, 1); render(); };
    tr.querySelector('input').onchange = (e)=>{ Cart.setQty(p.id, e.target.value); render(); };
    tr.querySelector('.remove').onclick= ()=>{ Cart.remove(p.id); render(); };
    return tr;
  }

  function render(){
    const items = Cart.list();
    tbody.innerHTML = '';
    if (!items.length){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="padding:18px;color:#64748b">Coșul este gol.</td>`;
      tbody.appendChild(tr);
    }else{
      items.forEach(p=> tbody.appendChild(row(p)));
    }
    const t = Cart.totals();
    subEl && (subEl.textContent = fmt(t.subtotal));
    discEl&& (discEl.textContent = '− ' + fmt(t.reducere));
    shipEl&& (shipEl.textContent = fmt(t.livrare));
    totEl && (totEl.textContent  = fmt(t.total));
  }

  // Submit comandă
  const form = document.getElementById('checkout-form');
  if (form){
    const btn = document.getElementById('place-order');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (btn){ btn.disabled = true; btn.textContent = 'Se trimite...'; }

      const items = Cart.list();
      if (!items.length){ alert('Coșul este gol.'); if(btn){btn.disabled=false;btn.textContent='Plasează comanda';} return; }

      // citește form
      const data = Object.fromEntries(new FormData(form).entries());
      const tip  = data.tip||'pf';
      const payload = {
        tip,
        nume: data.nume||'',
        prenume: data.prenume||'',
        email: data.email||'',
        telefon: data.telefon||'',
        judet: data.judet||'',
        oras: data.oras||'',
        adresa: data.adresa||'',
        codpostal: data.codpostal||'',
        mentiuni: data.mentiuni||'',
        firma: data.firma||'',
        cui: data.cui||'',
        regcom: data.regcom||''
      };

      const totals = Cart.totals();
      const orderId = uid();
      const html = buildProformaHTML(orderId, {...payload, tip}, items, totals);

      // Parametri email
      const paramsAdmin = {
        // către tine (setat în șablonul "Contact Us")
        nume: tip==='pj' ? payload.firma : (payload.nume+' '+payload.prenume).trim(),
        email: payload.email,
        tip: tip.toUpperCase(),
        telefon: payload.telefon,
        judet: payload.judet,
        oras: payload.oras,
        codpostal: payload.codpostal,
        adresa: payload.adresa,
        subtotal: fmt(totals.subtotal),
        livrare: fmt(totals.livrare),
        total: fmt(totals.total),
        mentiuni: payload.mentiuni,
        produse: items.map(p=> `- ${p.name} x ${p.qty} — ${fmt(p.price*p.qty)}`).join('\n'),
        order_id: orderId
      };

      const paramsClient = {
        to_email: payload.email,
        nume: tip==='pj' ? payload.firma : (payload.nume||''),
        order_id: orderId,
        html_proforma: html
      };

      try{
        // 1) email la admin
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TPL_ADMIN, paramsAdmin);
        // 2) email la client (proforma HTML)
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TPL_CLIENT, paramsClient);
        alert('Comanda a fost trimisă! Ți-am trimis proforma pe email.');
        Cart.clear();
        window.location.href = 'multumesc.html';
      }catch(err){
        console.error(err);
        alert('A apărut o eroare la trimiterea comenzii. Încearcă din nou.');
      }finally{
        if (btn){ btn.disabled=false; btn.textContent='Plasează comanda'; }
      }
    });
  }

  render();
});
</script>

<style>
/* controale cantitate – nu mai calcă peste titlu */
.qty{display:inline-flex;align-items:center;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.qty input{width:48px;text-align:center;border:none;outline:none;padding:8px 6px;appearance:textfield}
.qty button{width:38px;height:38px;border:none;background:#f8fafc;font-size:18px;cursor:pointer}
.qty button:active{transform:scale(.98)}
.remove{border:none;background:#fee2e2;color:#991b1b;border-radius:8px;width:38px;height:38px;cursor:pointer}
.remove:active{transform:scale(.98)}
</style>
