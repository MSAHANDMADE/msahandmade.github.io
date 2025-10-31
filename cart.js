/* ===========================
   MSA Handmade — cart.js (stable, 2025-10-31)
   - localStorage cart
   - reduceri + livrare (0 de la 300 RON pe SUBTOTAL BRUT)
   - EmailJS (client + admin) cu cheile MSA
   - anti-dublu, redirect multumesc.html
=========================== */
(function () {
  // === CONFIG ===
  const LS_KEY = "msa_cart_v1";
  const SHIPPING_BASE = 17;
  const FREE_SHIP_FROM = 300; // pragul se aplică la SUBTOTAL BRUT, indiferent de reduceri

  // Reduceri
  const DISCOUNTS = [
    { min: 400, pct: 0.20 },
    { min: 300, pct: 0.15 },
    { min: 200, pct: 0.10 },
  ];

  // EmailJS (CHEILE TALE — din contul tău, cum ai spus)
  const EMAILJS_PUBLIC   = "iSadfb7-TV_89l_6k";
  const EMAILJS_SERVICE  = "service_ix0zpp7";
  const TPL_ADMIN        = "template_13qpqtt"; // către admin
  const TPL_CLIENT       = "template_9yctwor";  // către client
  const ADMIN_EMAIL      = "msahandmade.contact@gmail.com";

  // Inițializează EmailJS o singură dată (dacă există script-ul)
  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(EMAILJS_PUBLIC); } catch(e){}
  }

  // === UTILS ===
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const money = n => `${(Number(n)||0).toFixed(2)} RON`;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr||[]));
  const findIndex = (cart, id) => cart.findIndex(i => i.id === id);

  // === CORE CART ===
  function add(item, qty = 1) {
    if (!item || !item.id) return;
    qty = Math.max(1, Number(qty)||1);
    const cart = read();
    const i = findIndex(cart, item.id);
    if (i >= 0) cart[i].qty += qty;
    else cart.push({
      id: item.id,
      name: item.name || "",
      price: Number(item.price) || 0,
      image: item.image || "",
      qty
    });
    write(cart);
    updateCartCountBadge();
    return cart;
  }
  // alias compatibilitate
  const addToCart = add;

  function removeFromCart(id) {
    const cart = read().filter(i => i.id !== id);
    write(cart);
    updateCartCountBadge();
    return cart;
  }

  function setQty(id, qty) {
    qty = Math.max(0, Number(qty)||0);
    const cart = read();
    const i = findIndex(cart, id);
    if (i >= 0) {
      if (qty === 0) cart.splice(i,1);
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

  // === TOTALURI ===
  function computeTotals(cart) {
    // subtotal BRUT (fara reduceri)
    const subtotal = cart.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||0), 0);

    // discount în funcție de subtotal
    let pct = 0;
    for (const r of DISCOUNTS) { if (subtotal >= r.min) { pct = r.pct; break; } }
    const discount = +(subtotal * pct).toFixed(2);

    // livrarea: 0 dacă SUBTOTAL >= FREE_SHIP_FROM (indiferent de discount)
    const shipping = subtotal >= FREE_SHIP_FROM ? 0 : SHIPPING_BASE;

    const total = +(subtotal - discount + shipping).toFixed(2);
    return {
      subtotal: +subtotal.toFixed(2),
      discount,
      pct: Math.round(pct*100),
      shipping: +shipping.toFixed(2),
      total
    };
  }

  const fmt = n => (Number(n)||0).toFixed(2);

  // === RENDER COȘ (cos.html) ===
  function render() {
    const body = $("#cart-body");
    if (!body) return; // nu suntem pe cos.html

    const cart = read();
    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ subtotal:0, discount:0, pct:0, shipping:SHIPPING_BASE, total:SHIPPING_BASE });
      return;
    }

    body.innerHTML = cart.map(rowHTML).join("");
    bindRowEvents();
    paintTotals(computeTotals(cart));
  }

  function rowHTML(i) {
    const line = (Number(i.price)||0) * (Number(i.qty)||0);
    return `
      <tr data-id="${esc(i.id)}">
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${esc(i.image)}" alt="${esc(i.name)}" width="72" height="72" style="border-radius:8px; object-fit:cover;">
            <div><b>${esc(i.name)}</b></div>
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
    // minus
    $all(".qminus").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        const input = $(".qinput", tr);
        const next = Math.max(0, Number(input.value||0) - 1);
        input.value = next;
        setQty(id, next);
        rerenderRow(tr);
      });
    });

    // plus
    $all(".qplus").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        const input = $(".qinput", tr);
        const next = Math.max(0, Number(input.value||0) + 1);
        input.value = next;
        setQty(id, next);
        rerenderRow(tr);
      });
    });

    // input direct
    $all(".qinput").forEach(inp=>{
      inp.addEventListener("change", ()=>{
        const tr = inp.closest("tr"); const id = tr.dataset.id;
        const val = Math.max(0, Number(inp.value||0));
        inp.value = val;
        setQty(id, val);
        rerenderRow(tr);
      });
    });

    // delete
    $all(".qdel").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        removeFromCart(id);
        tr.remove();
        if (!read().length) render(); else paintTotals(computeTotals(read()));
      });
    });
  }

  function rerenderRow(tr) {
    const id = tr.dataset.id;
    const cart = read();
    const item = cart.find(x=>x.id===id);
    if (!item) { tr.remove(); render(); return; }
    $(".line-total", tr).textContent = money((Number(item.price)||0)*(Number(item.qty)||0));
    paintTotals(computeTotals(cart));
  }

  function paintTotals(t) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = typeof val==="number" ? money(val) : val; };
    set("t-sub", t.subtotal);
    set("t-disc", t.discount);
    set("t-ship", t.shipping);
    set("t-total", t.total);
    // badge la zi
    updateCartCountBadge();
  }

  // === BADGE ===
  function updateCartCountBadge() {
    const count = read().reduce((s,i)=> s + (Number(i.qty)||0), 0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CHECKOUT (EmailJS + anti-dublu + redirect) ===
  function hookCheckout(formSel, submitBtnSel) {
    const form = $(formSel);
    const btn  = $(submitBtnSel);
    if (!form || !btn) return;

    let sending = false;
    const THROTTLE_MS = 60*1000;
    const lastKey = "msa_last_order_ts";

    const recentlySent = () => Date.now() - (Number(localStorage.getItem(lastKey)||0)) < THROTTLE_MS;

    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      if (sending) return;
      const cart = read();
      if (!cart.length) { alert("Coșul este gol."); return; }

      if (recentlySent()) {
        // nu mai spama, dar tot redirecționează spre mulțumesc ca UX
        try { window.location.href = "multumesc.html"; } catch {}
        return;
      }

      // colectăm date
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const t = computeTotals(cart);

      // order id
      const orderId = Math.random().toString(36).slice(2,8).toUpperCase();

      // produse text
      const produseText = cart.map(i =>
        `• ${i.name} x ${i.qty} = ${fmt((Number(i.price)||0)*(Number(i.qty)||0))} RON`
      ).join("\n");

      // payload comun
      const payload = {
        order_id: orderId,
        tip: data.tip || "Persoană fizică",
        nume: data.nume || "",
        prenume: data.prenume || "",
        email: data.email || "",
        telefon: data.telefon || "",
        judet: data.judet || "",
        oras: data.oras || "",
        codpostal: data.codpostal || "",
        adresa: data.adresa || "",
        // câmpuri PJ (pot fi goale la PF)
        firma: data.firma || "",
        cui: data.cui || "",
        regcom: data.regcom || "",
        // produse și totaluri
        produse: produseText,
        subtotal: fmt(t.subtotal),
        reducere: fmt(t.discount),
        pct: String(t.pct || 0),
        livrare: fmt(t.shipping),
        total: fmt(t.total),
        mentiuni: data.mentiuni || ""
      };

      // trimite emailuri
      sending = true;
      btn.disabled = true;
      const oldTxt = btn.textContent;
      btn.textContent = "Se trimite…";

      try{
        if (!window.emailjs) throw new Error("EmailJS indisponibil");

        // client
        await emailjs.send(EMAILJS_SERVICE, TPL_CLIENT, {
          to_email: data.email || "",
          ...payload
        });

        // admin
        await emailjs.send(EMAILJS_SERVICE, TPL_ADMIN, {
          to_email: ADMIN_EMAIL,
          ...payload
        });

        // marcare anti-dublu, golire coș, redirect
        localStorage.setItem(lastKey, String(Date.now()));
        clearCart();
        try { window.location.href = "multumesc.html"; } catch(e){}
      } catch(err){
        console.error("EmailJS error:", err);
        alert("A apărut o eroare la trimiterea comenzii. Te rugăm să reîncerci.");
        btn.disabled = false;
        btn.textContent = oldTxt;
        sending = false;
        return;
      }
    });
  }

  // === API PUBLIC ===
  window.MSACart = {
    // CRUD
    add, addToCart, removeFromCart, setQty, clearCart,
    // UI
    render, hookCheckout, updateCartCountBadge,
    // Utils
    computeTotals
  };

  // init badge la load
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
