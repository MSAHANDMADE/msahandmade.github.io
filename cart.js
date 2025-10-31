/* ================================
   MSA Handmade – cart.js (FINAL)
   ================================ */
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

  const $ = (s, r = document) => r.querySelector(s);
  const $all = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => `${n.toFixed(2)} RON`;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));
  const findIndex = (cart, id) => cart.findIndex(i => i.id === id);

  // ---------- CORE ----------
  function addToCart(item, qty = 1) {
    const cart = read();
    const i = findIndex(cart, item.id);
    if (i >= 0) cart[i].qty += qty;
    else cart.push({ id:item.id, name:item.name, price:+item.price||0, image:item.image||"", qty });
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
    qty = Math.max(0, +qty || 0);
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

  function clearCart() {
    write([]);
    updateCartCountBadge();
  }

  function totals(cart) {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let disc = 0;
    for (const r of rules.discounts) {
      if (sub >= r.min) { disc = sub * r.pct; break; }
    }
    const after = sub - disc;
    const ship = after >= rules.freeShipFrom || after === 0 ? 0 : rules.shippingFlat;
    const total = after + ship;
    return { sub, disc, ship, total };
  }

  // ---------- BADGE ----------
  function updateCartCountBadge() {
    const count = read().reduce((s, i) => s + i.qty, 0);
    const el = $("#cart-count");
    if (el) el.textContent = count;
  }

  // ---------- RENDER COȘ ----------
  function render() {
    const body = $("#cart-body");
    if (!body) return;
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
          <div style="display:flex;gap:10px;align-items:center;">
            <img src="${i.image}" alt="" width="72" height="72" style="border-radius:8px;object-fit:cover;">
            <div><b>${i.name}</b></div>
          </div>
        </td>
        <td>${money(i.price)}</td>
        <td>
          <div class="qty">
            <button class="qminus" type="button">−</button>
            <input class="qinput" inputmode="numeric" value="${i.qty}">
            <button class="qplus" type="button">+</button>
          </div>
        </td>
        <td class="line-total">${money(line)}</td>
        <td><button class="qdel btn ghost" type="button">✕</button></td>
      </tr>`;
  }

  function bindRowEvents() {
    $all(".qminus").forEach(btn => btn.addEventListener("click", ()=>{
      const tr = btn.closest("tr"); const id = tr.dataset.id;
      const input = $(".qinput", tr);
      const next = Math.max(0, +input.value - 1);
      input.value = next; setQty(id, next); rerenderRow(tr);
    }));
    $all(".qplus").forEach(btn => btn.addEventListener("click", ()=>{
      const tr = btn.closest("tr"); const id = tr.dataset.id;
      const input = $(".qinput", tr);
      const next = Math.max(0, +input.value + 1);
      input.value = next; setQty(id, next); rerenderRow(tr);
    }));
    $all(".qinput").forEach(inp => inp.addEventListener("change", ()=>{
      const tr = inp.closest("tr"); const id = tr.dataset.id;
      const val = Math.max(0, +inp.value || 0);
      inp.value = val; setQty(id, val); rerenderRow(tr);
    }));
    $all(".qdel").forEach(btn => btn.addEventListener("click", ()=>{
      const tr = btn.closest("tr"); const id = tr.dataset.id;
      removeFromCart(id); tr.remove();
      if (read().length === 0) render(); else paintTotals(totals(read()));
    }));
  }

  function rerenderRow(tr) {
    const id = tr.dataset.id;
    const cart = read();
    const item = cart.find(x => x.id === id);
    if (!item) { tr.remove(); render(); return; }
    $(".line-total", tr).textContent = money(item.price * item.qty);
    paintTotals(totals(cart));
  }

  function paintTotals(t) {
    const set = (id,v)=>{const e=document.getElementById(id);if(e)e.textContent=typeof v==="number"?money(v):v;};
    set("t-sub",t.sub); set("t-disc",t.disc); set("t-ship",t.ship); set("t-total",t.total);
  }

  // ---------- CHECKOUT ----------
  function hookCheckout(formSel, btnSel) {
    const form = $(formSel); const btn = $(btnSel);
    if (!form || !btn) return;
    form.addEventListener("submit", e=>{
      e.preventDefault();
      const cart = read();
      if (!cart.length){ alert("Coșul este gol."); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      const t = totals(cart);
      alert("Comanda a fost trimisă. Îți mulțumim!");
      clearCart(); render(); form.reset();
    });
  }

  // ---------- API ----------
  window.MSACart = { addToCart, removeFromCart, setQty, clearCart, render, hookCheckout, updateCartCountBadge };
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
