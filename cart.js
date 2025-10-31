<!-- cart.js -->
<script>
/* MSA Handmade – cart.js (stabil) */
/* localStorage + badge + reduceri + livrare + randare coș */

(function () {
  const LS_KEY = "msa_cart_v1";

  const rules = {
    shippingFlat: 17,
    freeShipFrom: 300,
    discounts: [
      { min: 400, pct: 0.20 },
      { min: 300, pct: 0.15 },
      { min: 200, pct: 0.10 },
    ],
  };

  // ---------- Utils ----------
  const $    = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => `${(Number(n)||0).toFixed(2)} RON`;

  const read  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr||[]));
  const findIndex = (cart, id) => cart.findIndex(i => i.id === id);

  // ---------- Core ----------
  function addToCart(item, qty = 1) {
    if (!item || !item.id) return read();
    const cart = read();
    const i = findIndex(cart, item.id);
    const q = Math.max(1, Number(qty)||1);
    if (i >= 0) cart[i].qty += q;
    else cart.push({
      id: item.id,
      name: item.name || "",
      price: Number(item.price) || 0,
      image: item.image || "",
      qty: q,
    });
    write(cart);
    updateCartCountBadge();
    return cart;
  }

  function removeFromCart(id) {
    const cart = read().filter(i => i.id !== id);
    write(cart);
    updateCartCountBadge();
    return cart;
  }

  function setQty(id, qty) {
    let cart = read();
    const i = findIndex(cart, id);
    const q = Math.max(0, Number(qty)||0);
    if (i >= 0) {
      if (q === 0) cart.splice(i,1); else cart[i].qty = q;
      write(cart);
      updateCartCountBadge();
    }
    return cart;
  }

  function clearCart() { write([]); updateCartCountBadge(); }

  function totals(cart) {
    const sub = cart.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||0), 0);
    let disc = 0;
    for (const r of rules.discounts) {
      if (sub >= r.min) { disc = sub * r.pct; break; }
    }
    const afterDisc = sub - disc;
    const ship = (afterDisc >= rules.freeShipFrom || afterDisc === 0) ? 0 : rules.shippingFlat;
    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  // ---------- Badge ----------
  function updateCartCountBadge() {
    const count = read().reduce((s,i)=> s + (Number(i.qty)||0), 0);
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
  }

  // ---------- Render coș (cos.html) ----------
  function render() {
    const body = document.getElementById('cart-body');
    if (!body) return; // nu suntem pe cos.html
    const cart = read();

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ sub:0, disc:0, ship:rules.shippingFlat, total:rules.shippingFlat });
      return;
    }

    body.innerHTML = cart.map(rowHTML).join('');
    bindRowEvents();
    paintTotals(totals(cart));
  }

  function rowHTML(i) {
    const line = (Number(i.price)||0) * (Number(i.qty)||0);
    return `
      <tr data-id="${i.id}">
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${i.image||''}" alt="" width="72" height="72" style="border-radius:8px; object-fit:cover;">
            <div><b>${i.name||''}</b></div>
          </div>
        </td>
        <td>${money(i.price)}</td>
        <td>
          <div class="qty" role="group" aria-label="Cantitate">
            <button class="qminus" type="button" aria-label="Scade">−</button>
            <input class="qinput" inputmode="numeric" value="${i.qty||1}">
            <button class="qplus"  type="button" aria-label="Crește">+</button>
          </div>
        </td>
        <td class="line-total">${money(line)}</td>
        <td><button class="qdel btn ghost" type="button" aria-label="Șterge">✕</button></td>
      </tr>
    `;
  }

  function bindRowEvents() {
    // minus
    $all('.qminus').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tr = btn.closest('tr'); const id = tr.dataset.id;
        const inp = tr.querySelector('.qinput');
        const next = Math.max(0, (Number(inp.value)||0)-1);
        inp.value = next;
        setQty(id, next);
        rerenderRow(tr);
      });
    });
    // plus
    $all('.qplus').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tr = btn.closest('tr'); const id = tr.dataset.id;
        const inp = tr.querySelector('.qinput');
        const next = Math.max(0, (Number(inp.value)||0)+1);
        inp.value = next;
        setQty(id, next);
        rerenderRow(tr);
      });
    });
    // input direct
    $all('.qinput').forEach(inp=>{
      inp.addEventListener('change', ()=>{
        const tr = inp.closest('tr'); const id = tr.dataset.id;
        const v = Math.max(0, Number(inp.value)||0);
        inp.value = v;
        setQty(id, v);
        rerenderRow(tr);
      });
    });
    // delete
    $all('.qdel').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tr = btn.closest('tr'); const id = tr.dataset.id;
        removeFromCart(id);
        tr.remove();
        if (read().length === 0) render(); else paintTotals(totals(read()));
      });
    });
  }

  function rerenderRow(tr) {
    const id = tr.dataset.id;
    const cart = read();
    const item = cart.find(x=>x.id===id);
    if (!item) { tr.remove(); render(); return; }
    tr.querySelector('.line-total').textContent = money(item.price * item.qty);
    paintTotals(totals(cart));
  }

  function paintTotals(t) {
    const put = (id,val) => { const el = document.getElementById(id); if (el) el.textContent = (typeof val === 'number') ? money(val) : val; };
    put('t-sub',  t.sub);
    put('t-disc', t.disc);
    put('t-ship', t.ship);
    put('t-total',t.total);
  }

  // ---------- Checkout helper (EmailJS opțional) ----------
  function hookCheckout(formSel, submitBtnSel) {
    const form = $(formSel);
    const btn  = $(submitBtnSel);
    if (!form || !btn) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const cart = read();
      if (!cart.length) { alert('Coșul este gol.'); return; }

      const data = Object.fromEntries(new FormData(form).entries());
      const t = totals(cart);

      // Trimite optional prin EmailJS (completează cu ID-urile tale)
      try {
        if (window.emailjs) {
          emailjs.init({ publicKey: 'iSadfb7-TV_89l_6k' }); // cheia ta publică
          // 1) către client:
          await emailjs.send('service_ix0zpp7','template_9yctwor', {
            to_email: data.email || '',
            nume: (data.nume||'') + ' ' + (data.prenume||''),
            subtotal: money(t.sub), reducere: money(t.disc), livrare: money(t.ship), total: money(t.total),
            cart_json: JSON.stringify(cart, null, 2)
          });
          // 2) către admin:
          await emailjs.send('service_ix0zpp7','template_13qpqtt', {
            to_email: 'msahandmade.contact@gmail.com',
            tip: data.tip || 'Persoană fizică',
            nume: data.nume || '', prenume: data.prenume || '', email: data.email || '', telefon: data.telefon || '',
            judet: data.judet || '', oras: data.oras || '', adresa: data.adresa || '',
            subtotal: money(t.sub), reducere: money(t.disc), livrare: money(t.ship), total: money(t.total),
            cart_json: JSON.stringify(cart, null, 2)
          });
        }
      } catch(err) {
        console.warn('EmailJS eroare (continui fără):', err);
      }

      alert('Mulțumim! Comanda a fost trimisă.');
      clearCart();
      render();
      try { form.reset(); } catch {}
    });
  }

  // ---------- API public ----------
  window.MSACart = {
    addToCart,
    add: addToCart,          // alias pt. compatibilitate
    removeFromCart,
    setQty,
    clearCart,
    render,
    hookCheckout,
    updateCartCountBadge
  };

  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
</script>
