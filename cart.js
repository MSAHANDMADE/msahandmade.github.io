/* MSA Handmade — coș + reduceri automate + livrare gratuită + EmailJS */
(function () {
  // === CONFIG ===
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING_BASE = 17;

  // EmailJS (cheile tale)
  const PUBLIC_KEY = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID = 'service_ix0zpp7';
  const TEMPLATE_ADMIN = 'template_13qpqtt'; // către tine
  const TEMPLATE_CLIENT = 'template_9yctwor'; // către client

  function initEmailJS() {
    if (window.emailjs && typeof emailjs.init === 'function') {
      try { emailjs.init(PUBLIC_KEY); } catch (e) {}
    }
  }

  // === STORAGE ===
  function readCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveCart(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  }

  // === BADGE ===
  function updateCartCountBadge() {
    const list = readCart();
    const count = Array.isArray(list) ? list.reduce((s,i)=>s+(parseInt(i.qty)||1),0) : 0;
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CRUD ===
  function addToCart({id, name, price, image}) {
    if (!id) return;
    const list = readCart();
    const idx = list.findIndex(p => p.id === id);
    price = Number(price)||0;
    if (idx > -1) list[idx].qty = (parseInt(list[idx].qty)||1) + 1;
    else list.push({id, name: name||'', price, image: image||'', qty: 1});
    saveCart(list);
    updateCartCountBadge();
  }
  function removeFromCart(indexOrId) {
    const list = readCart();
    const idx = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1){ list.splice(idx,1); saveCart(list); updateCartCountBadge(); }
  }
  function clearCart(){ saveCart([]); updateCartCountBadge(); }
  function setQty(indexOrId, v){
    const list = readCart();
    const idx = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1){
      const q = Math.max(1, Number(v)||1);
      list[idx].qty = q;
      saveCart(list);
      updateCartCountBadge();
    }
  }

  // === TOTALE + reduceri ===
  function computeTotals(list) {
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
    let pct = 0, shipping = SHIPPING_BASE;

    if (subtotal >= 400) pct = 20;
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) pct = 10;

    const discount = +(subtotal * pct / 100).toFixed(2);
    const total = +((subtotal - discount + shipping).toFixed(2));
    return { subtotal:+subtotal.toFixed(2), discount, shipping, total, pct };
  }

  // === RENDER cos.html ===
  function fmt(n){ return (Number(n)||0).toFixed(2); }

  function renderCartInto(mountId='items'){
    const list = readCart();
    const mount = document.getElementById(mountId);
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
          </div>
          <div class="cart-right">
            <button class="qty" data-act="dec">-</button>
            <input type="number" min="1" value="${p.qty||1}">
            <button class="qty" data-act="inc">+</button>
            <button class="danger" data-act="del">Șterge</button>
          </div>
        `;
        const input = card.querySelector('input');
        card.querySelector('[data-act="inc"]').onclick = ()=>{ input.value = Number(input.value||1)+1; input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="dec"]').onclick = ()=>{ input.value = Math.max(1, Number(input.value||1)-1); input.dispatchEvent(new Event('change')); };
        card.querySelector('[data-act="del"]').onclick = ()=>{ removeFromCart(idx); renderCartInto(mountId); refreshTotals(); };

        input.addEventListener('change', ()=>{
          setQty(idx, input.value);
          refreshTotals();
        });

        mount.appendChild(card);
      });
    }
  }

  function refreshTotals(){
    const t = computeTotals(readCart());
    const set = (id, val)=>{ const el = document.getElementById(id); if (el) el.textContent = val; };
    set('subtot', fmt(t.subtotal));
    set('disc', fmt(t.discount));
    set('ship', fmt(t.shipping));
    set('grand', fmt(t.total));
    updateCartCountBadge();
  }

  // === SUBMIT cu EmailJS ===
  async function submitOrder(formEl) {
    if (!window.emailjs){ alert('EmailJS indisponibil.'); return false; }
    initEmailJS();

    const list = readCart();
    const totals = computeTotals(list);
    const data = Object.fromEntries(new FormData(formEl).entries());
    const orderId = (''+Date.now()).slice(-5);

    const produseHtml = list.map(i=>`${i.name} × ${i.qty} — ${fmt(i.price*i.qty)} RON`).join('<br>');

    const adminParams = {
      site: 'msahandmade.ro',
      tip: data.tip || 'Persoană fizică',
      nume: data.nume||'',
      prenume: data.prenume||'',
      email: data.email||'',
      telefon: data.telefon||'',
      judet: data.judet||'',
      oras: data.oras||'',
      codpostal: data.codpostal||'',
      adresa: data.adresa||'',
      mentiuni: data.mentiuni||'',
      produse: produseHtml,
      subtotal: fmt(totals.subtotal),
      livrare: fmt(totals.shipping),
      total: fmt(totals.total),
      order_id: orderId
    };

    const clientParams = {
      email: data.email||'',
      nume: data.nume||'',
      order_id: orderId
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, adminParams);
      if (clientParams.email) await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, clientParams);

      localStorage.setItem('msa_last_order', JSON.stringify({
        id: orderId, ts: Date.now(), client: data, items: list, totals
      }));

      clearCart();
      window.location.href = 'multumesc.html';
      return true;
    } catch (e) {
      console.error(e);
      alert('Eroare la trimitere comanda.');
      return false;
    }
  }

  // expunere
  window.MSACart = {
    readCart, saveCart, addToCart, removeFromCart, clearCart,
    setQty, computeTotals, renderCartInto, refreshTotals, submitOrder,
    updateCartCountBadge
  };

  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
