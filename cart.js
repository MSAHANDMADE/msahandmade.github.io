/* MSA Handmade — coș + reduceri automate pe praguri + livrare gratuită ≥ 300 + EmailJS */
(function () {
  // === CONFIG ===
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING = 17;

  // EmailJS (cheile tale)
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt';  // către tine
  const TEMPLATE_CLIENT = 'template_9yctwor';  // către client

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
    const list = readCart();
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
    const i = list.findIndex(p => p.id === id);
    price = Number(price)||0;
    if (i>-1) list[i].qty = (parseInt(list[i].qty)||1) + 1;
    else list.push({id, name:name||'', price, image:image||'', qty:1});
    saveCart(list); updateCartCountBadge();
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
    if (idx>-1){
      const n = Math.max(1, parseInt(v)||1);
      list[idx].qty = n; saveCart(list); updateCartCountBadge();
    }
  }
  function increaseQty(index){ setQty(index, (readCart()[index]?.qty||1)+1); }
  function decreaseQty(index){ setQty(index, (readCart()[index]?.qty||1)-1); }

  // === Reducere automată pe praguri (după SUBTOTAL) ===
  function autoDiscountPct(subtotal){
    if (subtotal >= 400) return 20;
    if (subtotal >= 300) return 15;
    if (subtotal >= 200) return 10;
    return 0;
  }

  // === TOTALS (cu livrare gratuită la total după reducere ≥ 300 RON) ===
  function computeTotals(list = readCart()){
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0) * (parseInt(i.qty)||1), 0);

    const pct = autoDiscountPct(subtotal);               // procent pe SUBTOTAL
    const discount = +(subtotal * (pct/100)).toFixed(2);

    const afterDiscount = subtotal - discount;           // baza pentru livrare gratis
    const shipping = list.length ? (afterDiscount >= 300 ? 0 : SHIPPING) : 0;

    const total = +(afterDiscount + shipping).toFixed(2);
    return {
      subtotal:+subtotal.toFixed(2),
      pct,
      discount,
      shipping,
      total
    };
  }

  // === RENDER coș (dacă există #cart-list) ===
  const $ = (id)=> document.getElementById(id);
  const RON = (v)=> (Number(v)||0).toFixed(2) + ' RON';

  function renderCart(){
    const wrap = $('cart-list');
    if (!wrap) return;

    const list = readCart();
    wrap.innerHTML = '';

    if (!list.length){
      wrap.innerHTML = `<p style="color:#6b7280;margin:0">Coșul este gol.</p>`;
    } else {
      list.forEach((p,idx)=>{
        const price = Number(p.price)||0;
        const qty = parseInt(p.qty)||1;
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `
          <div class="row" style="justify-content:space-between">
            <div class="row">
              <img src="${p.image||'logo.png'}" alt="${p.name||''}">
              <div>
                <div style="font-weight:700">${p.name||''}</div>
                <div class="small">${RON(price)}</div>
              </div>
            </div>
            <div class="row">
              <div class="qty">
                <button data-dec="${idx}">−</button>
                <input data-qty="${idx}" value="${qty}">
                <button data-inc="${idx}">+</button>
              </div>
              <button class="remove" data-remove="${idx}">Șterge</button>
            </div>
          </div>
        `;
        wrap.appendChild(item);
      });
    }

    const t = computeTotals(list);
    $('sum-subtotal') && ($('sum-subtotal').textContent = RON(t.subtotal));
    $('sum-discount') && ($('sum-discount').textContent = t.pct ? `- ${RON(t.discount)} (${t.pct}%)` : '0.00 RON');
    $('sum-shipping') && ($('sum-shipping').textContent = RON(t.shipping));
    $('sum-total')    && ($('sum-total').textContent    = RON(t.total));

    updateCartCountBadge();
  }

  // === Submit comandă (EmailJS) ===
  async function submitOrder(form){
    const items = readCart();
    if (!items.length){ alert('Coșul este gol.'); return false; }
    if (!window.emailjs || typeof emailjs.send !== 'function'){
      alert('EmailJS indisponibil.'); return false;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const produse = items.map(i=>`${i.name} × ${i.qty} — ${(Number(i.price)||0).toFixed(2)} RON`).join('\n');
    const t = computeTotals(items);
    const order_id = `${Date.now()}-${Math.floor(Math.random()*100000)}`;

    const payload = {
      order_id,
      tip: data.tip || 'Persoană fizică',
      nume: data.nume||'', prenume: data.prenume||'',
      email: data.email||'', telefon: data.telefon||'',
      judet: data.judet||'', oras: data.oras||'',
      codpostal: data.codpostal||'', adresa: data.adresa||'',
      mentiuni: data.mentiuni||'',
      produse,
      subtotal: t.subtotal,
      reducere: t.discount,
      reducere_pct: t.pct,
      livrare: t.shipping,
      total: t.total
    };

    try{
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN,  payload);   // către tine
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, payload);   // către client
    }catch(err){
      alert('Eroare la trimitere: ' + (err?.text || err?.message || 'necunoscută'));
      return false;
    }

    clearCart();
    window.location.href = 'multumesc.html';
    return true;
  }

  // === INIT pe pagini ===
  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartCountBadge();

    // Coș: randare + acțiuni (doar dacă există #cart-list)
    if ($('cart-list')){
      renderCart();

      $('cart-list').addEventListener('click', (e)=>{
        const r = e.target;
        if (r.dataset.remove){ removeFromCart(parseInt(r.dataset.remove)); renderCart(); }
        if (r.dataset.inc){ increaseQty(parseInt(r.dataset.inc)); renderCart(); }
        if (r.dataset.dec){ decreaseQty(parseInt(r.dataset.dec)); renderCart(); }
      });
      $('cart-list').addEventListener('change', (e)=>{
        const q = e.target;
        if (q.dataset.qty){ setQty(parseInt(q.dataset.qty), q.value); renderCart(); }
      });

      const clr = document.getElementById('clear-cart');
      if (clr) clr.addEventListener('click', ()=>{ clearCart(); renderCart(); });

      const form = document.getElementById('order-form');
      if (form){
        form.addEventListener('submit', async (ev)=>{
          ev.preventDefault();
          const btn = form.querySelector('button[type="submit"]');
          const old = btn ? btn.textContent : '';
          if (btn){ btn.disabled=true; btn.textContent='Se trimite...'; }
          try {
            await submitOrder(form);
          } finally {
            if (btn){ btn.disabled=false; btn.textContent=old; }
          }
        });
      }
    }
  });

  // === API global (opțional) ===
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    increaseQty, decreaseQty, setQty,
    computeTotals, updateCartCountBadge
  };
})();
