/* ===========================
   MSA Handmade – cart.js (stable, EmailJS)
   LocalStorage + reduceri + livrare 17 RON (fara gratuit)
   =========================== */
(function () {
  // ---------- EmailJS CONFIG ----------
  const EMAILJS_PUBLIC_KEY   = 'iSadfb7-TV_89l_6k';         // din contul tău
  const SERVICE_ID           = 'service_xxxxxx';            // <<<< PUNE aici Service ID-ul tău
  const TEMPLATE_ADMIN_ID    = 'template_13qpqtt';          // Contact Us (către tine)
  const TEMPLATE_CLIENT_ID   = 'template_9yctwor';          // Order Confirmation (către client)

  // Inițializează EmailJS dacă există scriptul încărcat
  document.addEventListener('DOMContentLoaded', () => {
    try { if (window.emailjs) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch(e){}
  });

  // ---------- Cart Rules ----------
  const LS_KEY = 'msa_cart_v1';
  const rules = {
    shippingFlat: 17,          // Transport fix
    discounts: [               // Praguri reduceri
      { min: 400, pct: 0.20 },
      { min: 300, pct: 0.15 },
      { min: 200, pct: 0.10 },
    ],
  };

  // ---------- Helpers ----------
  const $    = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => `${(Number(n)||0).toFixed(2)} RON`;

  const read  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

  const findIdx = (cart, id) => cart.findIndex(i => i.id === id);

  // ---------- Core ----------
  function add(item, qty = 1){
    const cart = read();
    const i = findIdx(cart, item.id);
    if (i >= 0) cart[i].qty += qty;
    else cart.push({
      id: item.id, name: item.name, price: Number(item.price)||0,
      image: item.image||'', qty: qty
    });
    write(cart); updateCartCountBadge(); return cart;
  }
  // alias compatibilitate
  const addToCart = add;

  function removeFromCart(id){
    write(read().filter(i => i.id !== id));
    updateCartCountBadge();
  }

  function setQty(id, qty){
    qty = Math.max(0, Number(qty)||0);
    const cart = read();
    const i = findIdx(cart, id);
    if (i >= 0){
      if (qty === 0) cart.splice(i,1); else cart[i].qty = qty;
      write(cart); updateCartCountBadge();
    }
    return cart;
  }

  function clearCart(){ write([]); updateCartCountBadge(); }

  function totals(cart){
    const sub = cart.reduce((s,i)=> s + i.price * i.qty, 0);
    let disc = 0;
    for (const r of rules.discounts){ if (sub >= r.min){ disc = sub * r.pct; break; } }
    const afterDisc = sub - disc;
    const ship = sub === 0 ? 0 : rules.shippingFlat; // FARA livrare gratuita
    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  // ---------- Badge ----------
  function updateCartCountBadge(){
    const count = read().reduce((s,i)=> s + i.qty, 0);
    const el = $('#cart-count'); if (el) el.textContent = count;
  }

  // ---------- Render (cos.html) ----------
  function render(){
    const body = $('#cart-body');
    if (!body) return;
    const cart = read();

    if (!cart.length){
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ sub:0, disc:0, ship:rules.shippingFlat, total:rules.shippingFlat });
      return;
    }

    body.innerHTML = cart.map(rowHTML).join('');
    bindRowEvents();
    paintTotals(totals(cart));
  }

  function rowHTML(i){
    const line = i.price * i.qty;
    return `
      <tr data-id="${i.id}">
        <td>
          <div style="display:flex;gap:10px;align-items:center;">
            <img src="${i.image}" alt="" width="72" height="72" style="border-radius:8px;object-fit:cover;">
            <div><b>${i.name}</b></div>
          </div>
        </td>
        <td>${money(i.price)}</td>
        <td>
          <div class="qty" role="group" aria-label="Cantitate">
            <button class="qminus" type="button" aria-label="Scade">−</button>
            <input class="qinput" inputmode="numeric" value="${i.qty}">
            <button class="qplus" type="button" aria-label="Crește">+</button>
          </div>
        </td>
        <td class="line-total">${money(line)}</td>
        <td><button class="qdel btn ghost" type="button" aria-label="Șterge">✕</button></td>
      </tr>
    `;
  }

  function bindRowEvents(){
    $all('.qminus').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tr = btn.closest('tr'); const id = tr.dataset.id;
        const input = $('.qinput', tr);
        const next = Math.max(0, Number(input.value||0) - 1);
        input.value = next; setQty(id,next); rerenderRow(tr);
      });
    });
    $all('.qplus').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tr = btn.closest('tr'); const id = tr.dataset.id;
        const input = $('.qinput', tr);
        const next = Math.max(0, Number(input.value||0) + 1);
        input.value = next; setQty(id,next); rerenderRow(tr);
      });
    });
    $all('.qinput').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        const tr = inp.closest('tr'); const id = tr.dataset.id;
        const val = Math.max(0, Number(inp.value||0));
        inp.value = val; setQty(id,val); rerenderRow(tr);
      });
    });
    $all('.qdel').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tr = btn.closest('tr'); const id = tr.dataset.id;
        removeFromCart(id); tr.remove();
        if (read().length === 0) render(); else paintTotals(totals(read()));
      });
    });
  }

  function rerenderRow(tr){
    const id = tr.dataset.id; const cart = read();
    const item = cart.find(x=>x.id===id);
    if (!item){ tr.remove(); render(); return; }
    $('.line-total', tr).textContent = money(item.price * item.qty);
    paintTotals(totals(cart));
  }

  function paintTotals(t){
    const set = (id,val) => { const el = document.getElementById(id); if (el) el.textContent = typeof val === 'number' ? money(val) : val; };
    set('t-sub',   t.sub);
    set('t-disc',  t.disc);
    set('t-ship',  t.ship);
    set('t-total', t.total);
  }

  // ---------- EmailJS: payload builders ----------
  function buildOrderTableHTML(cart, t){
    const rows = cart.map(i =>
      `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(i.price)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(i.price*i.qty)}</td>
      </tr>`
    ).join('');
    return `
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th align="left"  style="padding:6px 8px;border-bottom:2px solid #222">Produs</th>
            <th align="right" style="padding:6px 8px;border-bottom:2px solid #222">Preț</th>
            <th align="center"style="padding:6px 8px;border-bottom:2px solid #222">Cant.</th>
            <th align="right" style="padding:6px 8px;border-bottom:2px solid #222">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" style="padding:6px 8px;text-align:right">Subtotal</td><td style="padding:6px 8px;text-align:right">${money(t.sub)}</td></tr>
          <tr><td colspan="3" style="padding:6px 8px;text-align:right">Reducere</td><td style="padding:6px 8px;text-align:right">${money(t.disc)}</td></tr>
          <tr><td colspan="3" style="padding:6px 8px;text-align:right">Livrare</td><td style="padding:6px 8px;text-align:right">${money(t.ship)}</td></tr>
          <tr><td colspan="3" style="padding:8px 8px;border-top:2px solid #222;text-align:right"><b>Total</b></td><td style="padding:8px 8px;border-top:2px solid #222;text-align:right"><b>${money(t.total)}</b></td></tr>
        </tfoot>
      </table>
    `;
  }

  function cartLines(cart){
    return cart.map(i => `• ${i.name} × ${i.qty} — ${money(i.price*i.qty)}`).join('\n');
  }

  // ---------- Checkout ----------
  function hookCheckout(formSel, submitBtnSel){
    const form = $(formSel); const btn = $(submitBtnSel);
    if (!form || !btn) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const cart = read();
      if (!cart.length){ alert('Coșul este gol.'); return; }

      const data = Object.fromEntries(new FormData(form).entries());
      const t = totals(cart);
      const orderId = `MSA-${Date.now()}`;

      // pregătim parametrii pentru ambele template-uri
      const order_table_html = buildOrderTableHTML(cart, t);
      const produse_text     = cartLines(cart);

      const baseParams = {
        order_id: orderId,
        // date client (numele câmpurilor din EmailJS din capturile tale)
        tip: data['tip'] || data['tip_client'] || 'Persoană fizică',
        nume: data['nume'] || '',
        prenume: data['prenume'] || '',
        email: data['email'] || '',
        telefon: data['telefon'] || '',
        judet: data['judet'] || '',
        oras: data['oras'] || '',
        codpostal: data['codpostal'] || '',
        adresa: data['adresa'] || '',
        mentiuni: data['mentiuni'] || '',
        // coș
        produse: produse_text,
        subtotal: t.sub.toFixed(2),
        livrare: t.ship.toFixed(2),
        total: t.total.toFixed(2),
        // pentru template-ul de client
        to_email: data['email'] || '',
        nume_client: (data['nume']||'') + (data['prenume']?(' '+data['prenume']):''),
        html_proforma: order_table_html,
        // JSON brute (dacă vrei debug în template)
        cart_json: JSON.stringify(cart, null, 2),
        totals_json: JSON.stringify(t, null, 2),
      };

      // trimite e-mailuri (dacă există emailjs + SERVICE_ID setat)
      try{
        if (!window.emailjs || SERVICE_ID === 'service_xxxxxx'){
          console.warn('EmailJS neconfigurat: setează SERVICE_ID în cart.js');
        }else{
          // 1) Către tine (admin)
          await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN_ID, baseParams);
          // 2) Către client (confirmare)
          if (baseParams.to_email) {
            await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT_ID, baseParams);
          }
        }
      }catch(err){
        console.error('Eroare EmailJS:', err);
        // nu blocăm comanda dacă e-mailul are o problemă; continuăm fluxul
      }

      // finalizează comanda
      clearCart();
      try { form.reset(); } catch {}
      window.location.href = 'multumesc.html';
    });
  }

  // ---------- API ----------
  window.MSACart = {
    add, addToCart,
    removeFromCart, setQty, clearCart,
    render, hookCheckout, updateCartCountBadge
  };

  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
