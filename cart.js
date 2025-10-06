/* MSA Handmade — cos + reduceri automate + livrare + EmailJS + PJ câmpuri */
(function () {
  // ==== CONFIG ====
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING_BASE = 17;

  // ==== EmailJS (cheile tale) ====
  const PUBLIC_KEY      = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID      = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt'; // către tine
  const TEMPLATE_CLIENT = 'template_9yctwor'; // către client

  // --- inițializează EmailJS în siguranță (cu retry) ---
  function initEmailJS() {
    if (window.emailjs && typeof emailjs.init === 'function') {
      try { emailjs.init(PUBLIC_KEY); console.log('EmailJS OK'); } catch(e){ console.error(e); }
    } else {
      setTimeout(initEmailJS, 500);
    }
  }
  // dacă emailjs e încărcat în cos.html via CDN, îl inițiem; dacă nu, nu stricăm nimic
  initEmailJS();

  // ==== STORAGE ====
  function _readCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function _saveCart(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  }

  // ==== BADGE (iconița din meniu) ====
  function updateCartBadge() {
    const list = _readCart();
    const count = list.reduce((s,i)=> s + (parseInt(i.qty)||1), 0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // ==== CRUD ====
  function addToCart({id, name, price, image}) {
    if (!id) return;
    const list = _readCart();
    const idx = list.findIndex(p => p.id === id);
    const p = parseFloat(price)||0;
    if (idx > -1) {
      list[idx].qty = (parseInt(list[idx].qty)||1) + 1;
    } else {
      list.push({ id, name: name||'', price: p, image: image||'', qty: 1 });
    }
    _saveCart(list);
    updateCartBadge();
  }
  function removeFromCart(indexOrId) {
    const list = _readCart();
    const idx = (typeof indexOrId === 'number')
      ? indexOrId
      : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) {
      list.splice(idx,1);
      _saveCart(list);
      updateCartBadge();
      renderCart(); // dacă suntem pe cos.html
    }
  }
  function clearCart() {
    _saveCart([]);
    updateCartBadge();
    renderCart();
  }
  function setQty(indexOrId, v) {
    const list = _readCart();
    const idx = (typeof indexOrId === 'number')
      ? indexOrId
      : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) {
      const q = Math.max(1, parseInt(v)||1);
      list[idx].qty = q;
      _saveCart(list);
      updateCartBadge();
      renderCart();
    }
  }
  function incQty(indexOrId, step=1) {
    const list = _readCart();
    const idx = (typeof indexOrId === 'number')
      ? indexOrId
      : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) {
      list[idx].qty = Math.max(1, (parseInt(list[idx].qty)||1) + step);
      _saveCart(list);
      updateCartBadge();
      renderCart();
    }
  }

  // ==== DISCOUNTS & SHIPPING ====
  function computeTotals(list) {
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0) * (Number(i.qty)||1), 0);
    let pct = 0;
    let shipping = SHIPPING_BASE;

    if (subtotal >= 400) { pct = 20; shipping = 0; }
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) { pct = 10; shipping = SHIPPING_BASE; }
    else { pct = 0; shipping = SHIPPING_BASE; }

    const discount = +(subtotal * pct / 100).toFixed(2);
    const total = +((subtotal - discount) + shipping).toFixed(2);
    return { subtotal:+subtotal.toFixed(2), pct, discount, shipping, total };
  }

  // ==== UI HELPERS ====
  function money(n){ return (Number(n)||0).toFixed(2); }

  // creează un element rapid
  function el(tag, attrs={}, html='') {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='class') e.className = v;
      else if (k==='dataset') Object.entries(v).forEach(([dk,dv])=> e.dataset[dk]=dv);
      else e.setAttribute(k, v);
    });
    if (html) e.innerHTML = html;
    return e;
  }

  // ===== RENDER pe cos.html =====
  function renderCart() {
    const mount = document.getElementById('items'); // container listă produse din coș
    const list = _readCart();
    const { subtotal, pct, discount, shipping, total } = computeTotals(list);

    // actualizează zona de totaluri dacă există elemente
    const subEl = document.getElementById('subtotal-amount') || document.getElementById('subtotal');
    const disEl = document.getElementById('discount-amount') || document.getElementById('discount');
    const shipEl= document.getElementById('shipping-amount') || document.getElementById('shipping');
    const totEl = document.getElementById('total-amount') || document.getElementById('total');

    if (subEl) subEl.textContent = money(subtotal) + ' RON';
    if (disEl) disEl.textContent = money(discount) + ' RON';
    if (shipEl) shipEl.textContent = money(shipping) + ' RON';
    if (totEl) totEl.textContent = money(total) + ' RON';

    // dacă nu suntem pe cos.html (nu există #items), ieșim liniștiți
    if (!mount) return;

    // listă goală
    if (!list.length) {
      mount.innerHTML = '<p style="padding:14px">Coșul tău este gol.</p>';
      return;
    }

    // redă fiecare produs
    mount.innerHTML = '';
    list.forEach((p, idx)=>{
      const row = el('div', {class:'cart-row'});
      row.innerHTML = `
        <div class="cart-item">
          <img src="${p.image||'logo.png'}" alt="" class="cart-thumb" />
          <div class="cart-info">
            <div class="cart-name">${p.name||''}</div>
            <div class="cart-price">${money(p.price)} RON</div>
          </div>
        </div>
        <div class="cart-actions">
          <button class="qty-btn" data-act="dec" data-idx="${idx}">–</button>
          <input type="number" class="qty-input" data-idx="${idx}" min="1" value="${p.qty||1}" />
          <button class="qty-btn" data-act="inc" data-idx="${idx}">+</button>
          <button class="del-btn" data-idx="${idx}">Șterge</button>
        </div>
      `;
      mount.appendChild(row);
    });

    // evenimente pe butoane/inputs din listă (delegare)
    mount.querySelectorAll('.qty-btn').forEach(b=>{
      b.onclick = () => {
        const idx = parseInt(b.dataset.idx);
        const act = b.dataset.act;
        incQty(idx, act==='inc' ? 1 : -1);
      };
    });
    mount.querySelectorAll('.qty-input').forEach(inp=>{
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.idx);
        setQty(idx, inp.value);
      };
    });
    mount.querySelectorAll('.del-btn').forEach(b=>{
      b.onclick = () => removeFromCart(parseInt(b.dataset.idx));
    });
  }

  // ===== FORM LOGIC (PF / PJ + submit) =====
  // inserează câmpurile PJ când e selectat „Persoană juridică”
  function ensurePJFields() {
    const host = document.getElementById('client-type') || document.querySelector('.client-type') || document.body;
    if (!host) return;

    // dacă nu există deja secțiunea PJ, o creăm
    if (!document.getElementById('pj-extra')) {
      const box = el('div', { id:'pj-extra', style:'display:none; margin-top:10px;' });
      box.innerHTML = `
        <label for="firma">Denumire firmă</label>
        <input id="firma" name="firma" class="input" />

        <label for="cui">CUI</label>
        <input id="cui" name="cui" class="input" />

        <label for="regcom">Nr. înregistrare la Registrul Comerțului</label>
        <input id="regcom" name="regcom" class="input" />
      `;
      // încercăm să-l punem exact sub radio-uri
      const radioWrap = document.querySelector('#client-type') || document.querySelector('.client-type') || document.querySelector('form');
      if (radioWrap) radioWrap.appendChild(box);
    }

    function togglePJ() {
      const v = (document.querySelector('input[name="tip"]:checked')||{}).value || 'fizica';
      const pj = document.getElementById('pj-extra');
      if (pj) pj.style.display = (v === 'juridica') ? 'block' : 'none';
    }
    document.querySelectorAll('input[name="tip"]').forEach(r => r.addEventListener('change', togglePJ));
    togglePJ();
  }

  // colectează datele formularului
  function getFormData() {
    const f = (sel)=> (document.getElementById(sel) || document.querySelector(`[name="${sel}"]`));
    const tip = (document.querySelector('input[name="tip"]:checked')||{}).value || 'fizica';

    const data = {
      tip,
      nume:    f('nume')?.value?.trim()||'',
      prenume: f('prenume')?.value?.trim()||'',
      email:   f('email')?.value?.trim()||'',
      telefon: f('telefon')?.value?.trim()||'',
      judet:   f('judet')?.value?.trim()||'',
      oras:    f('oras')?.value?.trim()||'',
      codpostal: f('codpostal')?.value?.trim()||'',
      adresa:  f('adresa')?.value?.trim()||'',
      mentiuni:f('mentiuni')?.value?.trim()||'',
      // PJ
      firma:   f('firma')?.value?.trim()||'',
      cui:     f('cui')?.value?.trim()||'',
      regcom:  f('regcom')?.value?.trim()||'',
    };

    // validări minimale
    if (!data.nume || !data.prenume || !data.email || !data.telefon || !data.judet || !data.oras || !data.codpostal || !data.adresa) {
      throw new Error('Completează toate câmpurile obligatorii.');
    }
    if (tip === 'juridica' && (!data.firma || !data.cui || !data.regcom)) {
      throw new Error('Completează și câmpurile firmei (Denumire, CUI, Nr. Reg. Comerț).');
    }
    return data;
  }

  // submit comandă via EmailJS
  async function submitOrder() {
    const btn = document.getElementById('place-order') || document.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Se trimite...'; }

    try {
      // verifică emailjs
      if (!(window.emailjs && typeof emailjs.send === 'function')) {
        alert('EmailJS indisponibil. Verifică integrarea.');
        if (btn) { btn.disabled = false; btn.textContent = 'Plasează comanda'; }
        return;
      }

      const list = _readCart();
      if (!list.length) { alert('Coșul este gol.'); if (btn) { btn.disabled=false; btn.textContent='Plasează comanda'; } return; }

      const totals = computeTotals(list);
      const data = getFormData();

      const itemsText = list.map(i => `• ${i.name} x ${i.qty} — ${money(i.price)} RON`).join('\n');

      const payload = {
        // câmpuri comune
        items: itemsText,
        subtotal: money(totals.subtotal) + ' RON',
        discount: money(totals.discount) + ' RON',
        shipping: money(totals.shipping) + ' RON',
        total: money(totals.total) + ' RON',
        reducere_pct: totals.pct + '%',
        // client
        tip_client: data.tip,
        nume: data.nume,
        prenume: data.prenume,
        email: data.email,
        telefon: data.telefon,
        judet: data.judet,
        oras: data.oras,
        cod_postal: data.codpostal,
        adresa: data.adresa,
        mentiuni: data.mentiuni || '-',
        // PJ extra
        firma: data.firma || '-',
        cui: data.cui || '-',
        regcom: data.regcom || '-'
      };

      // trimite către admin
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
      // trimite către client (dacă șablonul tău cere emailul clientului, setează-l în template)
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, payload);

      // succes → curăță coșul și redirect
      clearCart();
      window.location.href = 'multumesc.html';
    } catch (err) {
      console.error(err);
      alert('Eroare la trimitere comanda.');
      if (btn) { btn.disabled = false; btn.textContent = 'Plasează comanda'; }
    }
  }

  // leagă formularul din cos.html
  function bindCartPage() {
    // butonul „Golește coșul”
    const clearBtn = document.getElementById('clear-cart');
    if (clearBtn && !clearBtn._msaBound) {
      clearBtn._msaBound = true;
      clearBtn.addEventListener('click', (e)=>{ e.preventDefault(); clearCart(); });
    }
    // submit
    const form = document.getElementById('checkout-form') || document.querySelector('form');
    if (form && !form._msaBound) {
      form._msaBound = true;
      form.addEventListener('submit', (e)=>{ e.preventDefault(); submitOrder(); });
    }
    // PJ fields logic
    ensurePJFields();
    // prima randare
    renderCart();
  }

  // === Bind „Adaugă în coș” pe paginile de produse (evită dublări) ===
  function bindAddToCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(btn=>{
      if (btn._msaBound) return;
      btn._msaBound = true;
      btn.addEventListener('click', ()=>{
        const d = btn.dataset;
        addToCart({ id:d.id, name:d.name, price:d.price, image:d.image });
        // feedback mic
        const old = btn.textContent;
        btn.textContent = 'Adăugat!';
        setTimeout(()=> btn.textContent = old, 900);
      });
    });
  }

  // ===== Init pe fiecare pagină =====
  document.addEventListener('DOMContentLoaded', ()=>{
    updateCartBadge();
    bindAddToCartButtons();
    // dacă suntem pe pagina coșului
    if (document.getElementById('items') || document.getElementById('checkout-form')) {
      bindCartPage();
    }
  });

  // expune API pentru butoane custom
  window.MSACart = {
    addToCart, removeFromCart, clearCart,
    incQty, setQty, readCart: _readCart
  };
})();
