/* ===== MSA Handmade – cart.js (curat) ===== */
(function () {
  const LS_KEY = 'msa_cart';
  const RON = v => `${v.toFixed(2)} RON`;

  const state = {
    items: loadItems(),  // [{id,name,price,qty,img}]
  };

  /* ---------- storage ---------- */
  function loadItems() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(state.items));
  }

  /* ---------- helpers ---------- */
  function findIndex(id){ return state.items.findIndex(x => String(x.id)===String(id)); }
  function setQty(id, qty) {
    qty = Math.max(0, parseInt(qty || 0, 10));
    const i = findIndex(id);
    if (i >= 0) {
      if (qty === 0) state.items.splice(i,1);
      else state.items[i].qty = qty;
      save();
      render();
    }
  }
  function addQty(id, delta){
    const i = findIndex(id);
    if (i >= 0) setQty(id, (state.items[i].qty || 0) + delta);
  }
  function clearCart(){
    state.items = [];
    save();
    render();
  }

  /* ---------- totals ---------- */
  function totals() {
    const sub = state.items.reduce((s, it) => s + (Number(it.price)||0) * (Number(it.qty)||0), 0);
    const discRate = sub >= 400 ? 0.20 : sub >= 300 ? 0.15 : sub >= 200 ? 0.10 : 0;
    const disc = sub * discRate;
    const afterDisc = sub - disc;
    const ship = afterDisc >= 300 || sub === 0 ? 0 : 17;
    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  /* ---------- badge ---------- */
  function renderBadge(){
    const el = document.querySelector('#cart-count');
    if (el) el.textContent = state.items.reduce((s,it)=>s+(Number(it.qty)||0),0);
  }

  /* ---------- rows ---------- */
  function rowHTML(it){
    const line = (Number(it.price)||0) * (Number(it.qty)||0);
    return `
      <tr data-id="${it.id}">
        <td>
          <div style="display:flex; gap:12px; align-items:center;">
            <img src="${it.img || it.image || ''}" alt="" width="72" height="72" style="border-radius:8px; object-fit:cover">
            <div>
              <div style="font-weight:700">${it.name || it.title || 'Produs'}</div>
            </div>
          </div>
        </td>
        <td style="text-align:right">${RON(Number(it.price)||0)}</td>
        <td style="text-align:center">
          <div class="qty" data-id="${it.id}">
            <button class="qminus" type="button" aria-label="Scade">-</button>
            <input class="qval" type="number" inputmode="numeric" value="${it.qty}" aria-label="Cantitate">
            <button class="qplus" type="button" aria-label="Crește">+</button>
          </div>
        </td>
        <td style="text-align:right">${RON(line)}</td>
        <td>
          <button class="remove" type="button" aria-label="Șterge" style="display:none">×</button>
        </td>
      </tr>
    `;
  }

  /* ---------- render ---------- */
  function render() {
    // tabel
    const tbody = document.querySelector('#cart-body');
    if (tbody) {
      if (!state.items.length) {
        tbody.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      } else {
        tbody.innerHTML = state.items.map(rowHTML).join('');
      }
    }

    // evenimente pe tabel (plus, minus, input, remove)
    const table = document.querySelector('#cart-table');
    if (table && !table._msaBound) {
      table.addEventListener('click', (e)=>{
        const btn = e.target.closest('button');
        if (!btn) return;
        const wrap = btn.closest('.qty') || btn.closest('tr');
        const id = wrap?.dataset?.id || btn.closest('tr')?.dataset?.id;
        if (!id) return;

        if (btn.classList.contains('qminus')) addQty(id, -1);
        else if (btn.classList.contains('qplus')) addQty(id, +1);
        else if (btn.classList.contains('remove')) setQty(id, 0);
      });
      table.addEventListener('change', (e)=>{
        const inp = e.target.closest('.qval');
        if (!inp) return;
        const id = e.target.closest('.qty')?.dataset?.id;
        setQty(id, e.target.value);
      });
      table._msaBound = true;
    }

    // totals
    const t = totals();
    const elSub  = document.querySelector('#t-sub');
    const elDisc = document.querySelector('#t-disc');
    const elShip = document.querySelector('#t-ship');
    const elTot  = document.querySelector('#t-total');

    if (elSub)  elSub.textContent  = RON(t.sub);
    if (elDisc) elDisc.textContent = RON(t.disc);
    if (elShip) elShip.textContent = RON(t.ship);
    if (elTot)  elTot.textContent  = RON(t.total);

    renderBadge();
  }

  /* ---------- checkout hook (EmailJS existent) ---------- */
  function hookCheckout(formSel, submitBtnSel){
    const form = document.querySelector(formSel);
    if (!form) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const t = totals();
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
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
        items: state.items.map(i=>({nume:i.name, qty:i.qty, pret:i.price, total:(i.price*i.qty)})),
        subtotal: t.sub, reducere: t.disc, livrare: t.ship, total: t.total,
      };

      // Dacă folosești EmailJS, completează user/service/template în .env sau înlocuiește mai jos:
      try {
        if (window.emailjs?.send) {
          await emailjs.send('service_msa', 'template_comanda', {
            message: JSON.stringify(payload, null, 2)
          });
          alert('Comandă trimisă! Îți mulțumim!');
          clearCart();
          form.reset();
        } else {
          console.log('Comanda:', payload);
          alert('Comandă înregistrată local (EmailJS indisponibil).');
          clearCart();
          form.reset();
        }
      } catch (err) {
        console.error(err);
        alert('Nu am putut trimite comanda. Încearcă din nou.');
      }
    });
  }

  /* ---------- expune global ---------- */
  window.MSACart = {
    render, clearCart, hookCheckout,
    // API minim pentru paginile de produs (adăugare articol)
    add(product){
      // product: {id, name, price, img}
      const i = findIndex(product.id);
      if (i >= 0) state.items[i].qty += 1;
      else state.items.push({id:product.id, name:product.name, price:Number(product.price)||0, qty:1, img:product.img});
      save(); render();
    }
  };

  // Butonul “Golește coșul”
  document.getElementById('btn-clear')?.addEventListener('click', ()=>{
    if (confirm('Sigur golești coșul?')) clearCart();
  });

  // Auto-render la încărcare
  document.addEventListener('DOMContentLoaded', render);
})();
