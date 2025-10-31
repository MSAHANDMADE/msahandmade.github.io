/* MSA Handmade – cart.js v4 (stable)
   Stocare în localStorage + randare coș + badge + reduceri + livrare */
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
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => `${n.toFixed(2)} RON`;

  const read  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));
  const findIndex = (cart, id) => cart.findIndex(i => i.id === id);

  // ---------- Core ----------
  function addToCart(item, qty = 1) {
    const cart = read();
    const i = findIndex(cart, item.id);
    if (i >= 0) cart[i].qty += qty;
    else cart.push({ id:item.id, name:item.name, price:Number(item.price)||0, image:item.image||"", qty:qty });
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
    qty = Math.max(0, Number(qty) || 0);
    let cart = read();
    const i = findIndex(cart, id);
    if (i >= 0) {
      if (qty === 0) cart.splice(i, 1);
      else cart[i].qty = qty;
      write(cart);
      updateCartCountBadge();
    }
    return cart;
  }

  function clearCart() { write([]); updateCartCountBadge(); }

  function totals(cart) {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let disc = 0;
    for (const r of rules.discounts) { if (sub >= r.min) { disc = sub * r.pct; break; } }
    const afterDisc = sub - disc;
    const ship = afterDisc >= rules.freeShipFrom || afterDisc === 0 ? 0 : rules.shippingFlat;
    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  // ---------- Badge ----------
  function updateCartCountBadge() {
    const count = read().reduce((s, i) => s + i.qty, 0);
    const el = document.getElementById("cart-count");
    if (el) el.textContent = count;
  }

  // ---------- Render coș (cos.html) ----------
  function render() {
    const body = document.getElementById("cart-body");
    if (!body) return; // altă pagină
    const cart = read();

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ sub:0, disc:0, ship:rules.shippingFlat, total:rules.shippingFlat });
      return;
    }

    body.innerHTML = cart.map(rowHTML).join("");
    bindRowEvents();
    paintTotals(totals(cart));
  }

  function rowHTML(i) {
    const line = i.price * i.qty;
    return `
      <tr data-id="${i.id}">
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${i.image}" alt="" width="72" height="72" style="border-radius:8px; object-fit:cover;">
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

  function bindRowEvents() {
    $all(".qminus").forEach(btn => {
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        const input = tr.querySelector(".qinput");
        const next = Math.max(0, Number(input.value || 0) - 1);
        input.value = next; setQty(id, next); rerenderRow(tr);
      });
    });
    $all(".qplus").forEach(btn => {
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        const input = tr.querySelector(".qinput");
        const next = Math.max(0, Number(input.value || 0) + 1);
        input.value = next; setQty(id, next); rerenderRow(tr);
      });
    });
    $all(".qinput").forEach(inp => {
      inp.addEventListener("change", () => {
        const tr = inp.closest("tr"); const id = tr.dataset.id;
        const val = Math.max(0, Number(inp.value || 0));
        inp.value = val; setQty(id, val); rerenderRow(tr);
      });
    });
    $all(".qdel").forEach(btn => {
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        removeFromCart(id); tr.remove();
        if (read().length === 0) render(); else paintTotals(totals(read()));
      });
    });
  }

  function rerenderRow(tr) {
    const id = tr.dataset.id;
    const cart = read();
    const item = cart.find(x => x.id === id);
    if (!item) { tr.remove(); render(); return; }
    tr.querySelector(".line-total").textContent = money(item.price * item.qty);
    paintTotals(totals(cart));
  }

  function paintTotals(t) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = typeof val === "number" ? money(val) : val;
    };
    set("t-sub", t.sub);
    set("t-disc", t.disc);
    set("t-ship", t.ship);
    set("t-total", t.total);
  }

  // ---------- Checkout helper ----------
  function hookCheckout(formSel, submitBtnSel) {
    const form = document.querySelector(formSel);
    const btn  = document.querySelector(submitBtnSel);
    if (!form || !btn) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const cart = read();
      if (!cart.length) { alert("Coșul este gol."); return; }

      const data = Object.fromEntries(new FormData(form).entries());
      const t = totals(cart);

      try {
        if (window.emailjs) {
          emailjs.init({ publicKey: 'YOUR_EMAILJS_PUBLIC_KEY' });
          emailjs.send('service_id','template_id', {
            cart_json: JSON.stringify(cart, null, 2),
            totals_json: JSON.stringify(t, null, 2),
            ...data
          });
        }
      } catch(e){ console.warn("EmailJS nedefinit/oprit:", e); }

      alert("Comanda a fost trimisă. Îți mulțumim!");
      clearCart(); render(); try { form.reset(); } catch{}
    });
  }

  // ---------- API public ----------
  window.MSACart = {
    addToCart,
    // alias pentru cod vechi
    add: addToCart,
    removeFromCart,
    setQty,
    clearCart,
    render,
    hookCheckout,
    updateCartCountBadge
  };

  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
