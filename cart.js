/* MSA Handmade — coș + reduceri + livrare + EmailJS + proformă */
(function () {
  // === CONFIG ===
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING = 17;

  // EmailJS (cheile tale)
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt'; // către tine
  const TEMPLATE_CLIENT = 'template_9yctwor'; // către client

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
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    price = Number(price)||0;
    if (i>-1) list[i].qty = (parseInt(list[i].qty)||1) + 1;
    else list.push({ id, name: name||'', price: Number(price)||0, image: image||'', qty: 1});
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
    if (idx<0) return;
    const n = Math.max(1, Number(v)||1);
    list[idx].qty = n;
    saveCart(list);
    updateCartCountBadge();
  }
  function changeQty(indexOrId, delta){
    const list = readCart();
    const idx = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx<0) return;
    const n = Math.max(1, (parseInt(list[idx].qty)||1) + (delta||0));
    list[idx].qty = n;
    saveCart(list);
    updateCartCountBadge();
  }

  // === TOTALS (reduceri + livrare) ===
  function computeTotals(list) {
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
    let pct = 0, shipping = SHIPPING;

    if      (subtotal >= 400) { pct = 20; shipping = 0; }
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) { pct = 10; }

    const discount = +(subtotal * pct / 100).toFixed(2);
    const total = +((subtotal - discount + shipping)).toFixed(2);
    return { subtotal:+subtotal.toFixed(2), discount, shipping, total, pct };
  }
  const fmt = (n)=> (Number(n)||0).toFixed(2);

  // escape pt. HTML
  const escapeHtml = (s='') => String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');

  // === RENDER COȘ ===
  function render(){
    const list = readCart();
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
            <img class="thumb" src="${p.image||'logo.png'}" alt="${escapeHtml(p.name||'')}">
            <div>
              <div class="name">${escapeHtml(p.name||'')}</div>
              <div class="price">${fmt(p.price)} RON</div>
            </div>
          </div>
          <div class="qty">
            <button data-act="dec" data-id="${escapeHtml(p.id)}" data-idx="${idx}">−</button>
            <input type="number" min="1" value="${p.qty||1}" data-idx="${idx}">
            <button data-act="inc" data-id="${escapeHtml(p.id)}" data-idx="${idx}">+</button>
          </div>
          <button class="danger" data-act="del" data-idx="${idx}">Șterge</button>
        `;
        mount.appendChild(card);

        // bindings
        const input = card.querySelector('input');
        card.querySelector('[data-act="dec"]').onclick = ()=> changeQty(idx, -1);
        card.querySelector('[data-act="inc"]').onclick = ()=> changeQty(idx, +1);
        card.querySelector('[data-act="del"]').onclick = ()=> { removeFromCart(idx); render(); };
        input.addEventListener('input', ()=> setQty(idx, input.value));
      });
    }

    const t = computeTotals(readCart());
    const st = document.getElementById('subtot');
    const dc = document.getElementById('disc');
    const sh = document.getElementById('ship');
    const gr = document.getElementById('grand');
    if (st) st.textContent = fmt(t.subtotal);
    if (dc) dc.textContent = fmt(t.discount);
    if (sh) sh.textContent = fmt(t.shipping);
    if (gr) gr.textContent = fmt(t.total);
    updateCartCountBadge();
  }

  // === SUBMIT ===
  async function submitOrder(formEl){
    const list = readCart();
    if (!list.length) { alert('Coșul este gol.'); return false; }

    // calcule
    const totals = computeTotals(list);

    // culege date formular
    const fd = new FormData(formEl);
    const tip = fd.get('tip') || 'Persoană fizică';
    const data = {
      id: Math.random().toString(36).slice(2,7).toUpperCase(),
      ts: Date.now(),
      items: list.map(i=>({id:i.id, name:i.name, price:i.price, qty:i.qty})),
      totals,
      tip,
      nume: fd.get('nume')||'',
      prenume: fd.get('prenume')||'',
      email: fd.get('email')||'',
      telefon: fd.get('telefon')||'',
      judet: fd.get('judet')||'',
      oras: fd.get('oras')||'',
      codpostal: fd.get('codpostal')||'',
      adresa: fd.get('adresa')||'',
      mentiuni: fd.get('mentiuni')||'',
      firma: fd.get('denumire')||'',
      cui: fd.get('cui')||'',
      regcom: fd.get('regcom')||'',
      cont: fd.get('cont')||'',
    };

    // păstrăm o copie pt. proformă
    try { localStorage.setItem('msa_last_order', JSON.stringify(data)); } catch(e){}

    // pregătim emailuri
    const adminVars = {
      subject: `Comandă nouă #${data.id}`,
      message: `
      Tip: ${data.tip}
      Client: ${data.nume} ${data.prenume}
      Email: ${data.email}
      Telefon: ${data.telefon}
      Adresă: ${data.adresa}, ${data.oras}, ${data.judet}, ${data.codpostal}
      ${data.tip==='Persoană juridică' ? `Firmă: ${data.firma} | CUI: ${data.cui} | Reg. Com.: ${data.regcom} | IBAN: ${data.cont}` : ''}

      Produse:
      ${data.items.map(i=>`- ${i.name} x${i.qty} = ${(i.price*i.qty).toFixed(2)} RON`).join('\n')}

      Subtotal: ${totals.subtotal.toFixed(2)} RON
      Reducere: ${totals.discount.toFixed(2)} RON
      Livrare: ${totals.shipping.toFixed(2)} RON
      TOTAL: ${totals.total.toFixed(2)} RON
      `.trim()
    };

    const clientVars = {
      to_name: `${data.nume} ${data.prenume}`.trim() || 'client',
      subject: `Order Confirmed #${data.id}!`,
      message: `
      Îți mulțumim pentru comandă!
      Total de plată: ${totals.total.toFixed(2)} RON.
      Ne vom auzi în curând cu detalii de livrare.
      `.trim()
    };

    // trimite prin EmailJS (dacă e disponibil)
    if (!(window.emailjs && typeof emailjs.send === 'function')) {
      alert('EmailJS indisponibil. Te rog verifică integrarea.');
      return false;
    }

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, adminVars);
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, clientVars);
      clearCart();
      window.location.href = 'multumesc.html';
      return true;
    } catch(err) {
      alert('Eroare la trimitere comanda.');
      return false;
    }
  }

  // === EXPUSE global (folosite în produse.html) ===
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    setQty, changeQty,
    updateCartCountBadge,
    render,
    submitOrder
  };

  // auto-init coș dacă suntem pe cos.html
  document.addEventListener('DOMContentLoaded', ()=>{
    // badge pe orice pagină
    updateCartCountBadge();

    // dacă există #items => suntem pe coș
    if (document.getElementById('items')) {
      render();

      // buton golește
      const clearBtn = document.getElementById('clear');
      if (clearBtn) clearBtn.addEventListener('click', ()=>{ clearCart(); render(); });

      // submit comandă
      const form = document.getElementById('order-form');
      if (form) form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        await submitOrder(form);
      });
    }
  });
})();
