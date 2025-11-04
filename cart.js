<script>
// ====== CONFIG EmailJS (din pozele tale) ======
const EMAILJS_SERVICE_ID   = 'service_ix0zpp7';
const EMAILJS_PUBLIC_KEY   = 'isadfb7-TV_89l_6k';
const TEMPLATE_ADMIN       = 'template_13qpqtt'; // “Contact Us” — la magazin
const TEMPLATE_CLIENT      = 'template_9yctwor'; // “Order Confirmation” — la client

// ====== REDUCERI & LIVRARE ======
const SHIPPING_BASE = 20; // RON
const FREE_SHIP_AT  = 300;
function calcTotals(items){
  const subtotal = items.reduce((s,it)=>s + Number(it.price)*Number(it.qty), 0);
  let reducere = 0;
  if (subtotal >= 400) reducere = subtotal * 0.20;
  else if (subtotal >= 300) reducere = subtotal * 0.15;
  else if (subtotal >= 200) reducere = subtotal * 0.10;
  const livrare = (subtotal - reducere) >= FREE_SHIP_AT || subtotal===0 ? 0 : SHIPPING_BASE;
  const total   = subtotal - reducere + livrare;
  return {subtotal, reducere, livrare, total};
}
const fmt = v => (Number(v)||0).toFixed(2) + ' RON';

// ====== RANDARE TABEL ======
const tbody  = document.getElementById('cart-body');
const subEl  = document.getElementById('subval');
const discEl = document.getElementById('discval');
const shipEl = document.getElementById('shipval');
const totEl  = document.getElementById('totval');

function render(){
  const items = MSACart.getCart();
  if (!items.length){
    tbody.innerHTML = `<tr><td colspan="4">Coșul este gol.</td></tr>`;
  } else {
    tbody.innerHTML = items.map(it=>`
      <tr data-id="${it.id}">
        <td>
          <div style="display:flex;gap:10px;align-items:center">
            ${it.image ? `<img src="${it.image}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px">` : ``}
            <div><strong>${it.name}</strong><br><small>${fmt(it.price)}</small></div>
          </div>
        </td>
        <td class="qty">
          <button class="qminus" aria-label="minus">−</button>
          <input type="number" min="1" value="${it.qty}" style="width:64px;text-align:center">
          <button class="qplus" aria-label="plus">+</button>
        </td>
        <td style="text-align:right"><strong>${fmt(it.price*it.qty)}</strong></td>
        <td><button class="qremove" title="Șterge">🗑️</button></td>
      </tr>
    `).join('');
  }
  const t = calcTotals(items);
  subEl.textContent  = fmt(t.subtotal);
  discEl.textContent = fmt(t.reducere);
  shipEl.textContent = fmt(t.livrare);
  totEl.textContent  = fmt(t.total);
  bindRowEvents();
  MSACart.updateCartCountBadge();
}

function bindRowEvents(){
  tbody.querySelectorAll('tr').forEach(row=>{
    const id = row.dataset.id;
    row.querySelector('.qminus')?.addEventListener('click', ()=>{ MSACart.changeQty(id,-1); render(); });
    row.querySelector('.qplus')?.addEventListener('click', ()=>{ MSACart.changeQty(id, 1); render(); });
    row.querySelector('input')?.addEventListener('change', (e)=>{ MSACart.setQty(id, e.target.value); render(); });
    row.querySelector('.qremove')?.addEventListener('click', ()=>{ MSACart.remove(id); render(); });
  });
}

document.getElementById('clear-cart').addEventListener('click', ()=>{ MSACart.clear(); render(); });
render();

// ====== EMAILJS & COMANDĂ ======
function tableHTML(items){
  return `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr>
        <th style="text-align:left;border-bottom:1px solid #eee;padding:8px">Produs</th>
        <th style="text-align:right;border-bottom:1px solid #eee;padding:8px">Cant.</th>
        <th style="text-align:right;border-bottom:1px solid #eee;padding:8px">Preț</th>
        <th style="text-align:right;border-bottom:1px solid #eee;padding:8px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it=>`
        <tr>
          <td style="padding:8px;border-bottom:1px solid #f2f2f2">${it.name}</td>
          <td style="padding:8px;text-align:right;border-bottom:1px solid #f2f2f2">${it.qty}</td>
          <td style="padding:8px;text-align:right;border-bottom:1px solid #f2f2f2">${fmt(it.price)}</td>
          <td style="padding:8px;text-align:right;border-bottom:1px solid #f2f2f2">${fmt(it.price*it.qty)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

async function sendOrder(e){
  e.preventDefault();

  const items = MSACart.getCart();
  if (!items.length){ alert('Coșul este gol.'); return; }

  // form values
  const f = e.target;
  const form = Object.fromEntries(new FormData(f).entries());
  const order_id = Math.floor(100000 + Math.random()*900000);

  // totale
  const t = calcTotals(items);

  // HTML proformă (inclusiv blocul tău PFA deja în proforma.html)
  // simplu: punem tabelul + totaluri într-un container
  const html_proforma = `
    <h2 style="margin:12px 0">Proformă</h2>
    ${tableHTML(items)}
    <p style="text-align:right;margin-top:8px">Subtotal: <strong>${fmt(t.subtotal)}</strong></p>
    <p style="text-align:right">Reducere: <strong>${fmt(t.reducere)}</strong></p>
    <p style="text-align:right">Livrare: <strong>${fmt(t.livrare)}</strong></p>
    <p style="text-align:right;font-size:18px">Total: <strong>${fmt(t.total)}</strong></p>
  `;

  // params pentru email magazin
  const paramsAdmin = {
    tip: form.tip === 'PJ' ? 'Persoană juridică' : 'Persoană fizică',
    denumire: form.denumire || '',
    cui: form.cui || '',
    regcom: form.regcom || '',
    nume: form.nume || '',
    prenume: form.prenume || '',
    email: form.email || '',
    telefon: form.telefon || '',
    judet: form.judet || '',
    oras: form.oras || '',
    codpostal: form.codpostal || '',
    adresa: form.adresa || '',
    mentiuni: form.mentiuni || '',
    produse: items.map(it=>`${it.name} × ${it.qty} = ${fmt(it.price*it.qty)}`).join('<br>'),
    subtotal: fmt(t.subtotal),
    livrare: fmt(t.livrare),
    total: fmt(t.total),
    order_id
  };

  // params pentru email client
  const paramsClient = {
    to_email: form.email,
    nume: form.nume,
    order_id,
    html_proforma
  };

  // trimite
  try{
    if (!emailjs.__initialized) {
      emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      emailjs.__initialized = true;
    }
    // 1) către magazin
    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_ADMIN, paramsAdmin);
    // 2) către client
    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_CLIENT, paramsClient);

    alert('Comanda a fost trimisă! Ți-am trimis confirmarea pe email.');
    MSACart.clear();
    window.location.href = 'multumesc.html';
  }catch(err){
    console.error('EmailJS error:', err);
    alert('A apărut o eroare la trimiterea emailului. Verifică template-urile și cheile EmailJS.');
  }
}

document.getElementById('order-form').addEventListener('submit', sendOrder);

// afișare câmpuri PJ
document.querySelectorAll('input[name="tip"]').forEach(r=>{
  r.addEventListener('change', ()=>{
    const show = document.querySelector('input[name="tip"]:checked').value === 'PJ';
    document.querySelector('.pj-only').style.display = show ? 'block' : 'none';
  });
});
</script>
