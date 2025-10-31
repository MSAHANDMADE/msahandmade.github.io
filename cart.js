/* ===========================
   MSA Handmade — cart.js (final)
   LocalStorage + coș + reduceri + livrare + EmailJS
   =========================== */
(function () {
  const LS_KEY = "msa_cart_v1";

  // ——— Reguli de preț ———
  const RULES = {
    shippingFlat: 17,
    freeShipFromSubtotal: 300, // livrare 0 LEI dacă SUBTOTAL >= 300 (indiferent de reduceri)
    discounts: [
      { min: 400, pct: 0.20 },
      { min: 300, pct: 0.15 },
      { min: 200, pct: 0.10 },
    ],
  };

  // ——— EmailJS (datele tale) ———
  const EJ = {
    publicKey: "iSadfb7-TV_89l_6k",
    serviceId: "service_ix0zpp7",
    tplOwner: "template_13qpqtt",  // către MSA
    tplClient: "template_9yctwor", // către client
  };

  // ===== Utils =====
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => `${n.toFixed(2)} RON`;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));
  const findIndex = (cart, id) => cart.findIndex(i => i.id === id);

  // ===== Core Cart =====
  function add(item, qty = 1) {
    const cart = read();
    const i = findIndex(cart, item.id);
    if (i >= 0) cart[i].qty += qty;
    else cart.push({ id: item.id, name: item.name, price: Number(item.price)||0, image: item.image||"", qty });
    write(cart);
    updateCartCountBadge();
    return cart;
  }
  function removeItem(id) {
    const cart = read().filter(i => i.id !== id);
    write(cart);
    updateCartCountBadge();
    return cart;
  }
  function setQty(id, qty) {
    qty = Math.max(0, Number(qty) || 0);
    const cart = read();
    const i = findIndex(cart, id);
    if (i >= 0) {
      if (qty === 0) cart.splice(i, 1); else cart[i].qty = qty;
      write(cart);
      updateCartCountBadge();
    }
    return cart;
  }
  function clearCart() { write([]); updateCartCountBadge(); }

  // Subtotal, discount, shipping (free by SUBTOTAL), total
  function calcTotals(cart) {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let disc = 0;
    for (const r of RULES.discounts) {
      if (sub >= r.min) { disc = sub * r.pct; break; }
    }
    const afterDisc = sub - disc;
    const ship = (sub >= RULES.freeShipFromSubtotal || sub === 0) ? 0 : RULES.shippingFlat;
    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  // ===== Badge coș =====
  function updateCartCountBadge() {
    const count = read().reduce((s, i) => s + i.qty, 0);
    const el = $("#cart-count");
    if (el) el.textContent = count;
  }

  // ===== Render coș (cos.html) =====
  function render() {
    const body = $("#cart-body");
    if (!body) return; // nu suntem în coș
    const cart = read();

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ sub:0, disc:0, ship:RULES.shippingFlat, total: RULES.shippingFlat });
      return;
    }

    body.innerHTML = cart.map(rowHTML).join("");
    bindRowEvents(body);
    paintTotals(calcTotals(cart));

    // Mic hotfix pentru mobile: asigură lățime suficientă la stepper
    injectQtyFixCSS();
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

  function bindRowEvents(table) {
    // Event delegation — funcționează și după rerender
    table.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const tr = btn.closest("tr");
      if (!tr) return;
      const id = tr.dataset.id;
      const input = $(".qinput", tr);

      if (btn.classList.contains("qminus")) {
        const next = Math.max(0, Number(input.value||0) - 1);
        input.value = next; setQty(id, next); rerenderRow(tr);
      }
      if (btn.classList.contains("qplus")) {
        const next = Math.max(0, Number(input.value||0) + 1);
        input.value = next; setQty(id, next); rerenderRow(tr);
      }
      if (btn.classList.contains("qdel")) {
        removeItem(id); tr.remove();
        if (read().length === 0) render(); else paintTotals(calcTotals(read()));
      }
    });

    table.addEventListener("change", (e) => {
      const inp = e.target.closest(".qinput");
      if (!inp) return;
      const tr = inp.closest("tr"), id = tr.dataset.id;
      const val = Math.max(0, Number(inp.value || 0));
      inp.value = val; setQty(id, val); rerenderRow(tr);
    });
  }

  function rerenderRow(tr) {
    const id = tr.dataset.id;
    const cart = read();
    const item = cart.find(x => x.id === id);
    if (!item) { tr.remove(); render(); return; }
    $(".line-total", tr).textContent = money(item.price * item.qty);
    paintTotals(calcTotals(cart));
  }

  function paintTotals(t) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = typeof val === "number" ? money(val) : val; };
    set("t-sub", t.sub);
    set("t-disc", t.disc);
    set("t-ship", t.ship);
    set("t-total", t.total);
  }

  function injectQtyFixCSS() {
    if (document.getElementById("msa-qty-fix")) return;
    const style = document.createElement("style");
    style.id = "msa-qty-fix";
    style.textContent = `
      .qty{max-width:140px}
      .qty button{width:32px;height:32px;font-size:18px}
      .qty input{width:48px}
      @media (max-width:420px){
        .qty{max-width:132px}
        .qty button{width:28px;height:28px;font-size:16px}
        .qty input{width:44px;height:28px;font-size:14px}
      }
    `;
    document.head.appendChild(style);
  }

  // ===== Checkout =====
  function hookCheckout(formSel, submitBtnSel) {
    const form = $(formSel);
    const btn  = $(submitBtnSel);
    if (!form || !btn) return;

    // Toggle extra câmpuri PF/PJ
    const radios = $$('input[name="tip"]', form);
    const firma = $('input[name="firma"]', form);
    const cui = $('input[name="cui"]', form);
    function applyPJ() {
      const v = (radios.find(r => r.checked)?.value || "Persoană fizică");
      const pj = v.toLowerCase().includes("jurid");
      if (firma) { firma.disabled = !pj; firma.placeholder = pj ? "Nume firmă" : "Doar pentru persoane juridice"; if(!pj) firma.value=""; }
      if (cui) { cui.disabled = !pj; cui.placeholder = pj ? "RO..." : "—"; if(!pj) cui.value=""; }
    }
    radios.forEach(r => r.addEventListener("change", applyPJ));
    applyPJ();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cart = read();
      if (!cart.length) { alert("Coșul este gol."); return; }

      const data = Object.fromEntries(new FormData(form).entries());
      const t = calcTotals(cart);
      const orderId = Math.random().toString(36).slice(2, 8).toUpperCase();

      // Proforma HTML (simplă)
      const rows = cart.map(i =>
        `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:right">${money(i.price)}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${money(i.price*i.qty)}</td></tr>`
      ).join("");
      const htmlProforma = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th align="left">Produs</th><th align="right">Preț</th><th align="center">Cant.</th><th align="right">Total</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" align="right"><b>Subtotal</b></td><td align="right">${money(t.sub)}</td></tr>
            <tr><td colspan="3" align="right"><b>Reducere</b></td><td align="right">-${money(t.disc)}</td></tr>
            <tr><td colspan="3" align="right"><b>Livrare</b></td><td align="right">${money(t.ship)}</td></tr>
            <tr><td colspan="3" align="right"><b>Total</b></td><td align="right"><b>${money(t.total)}</b></td></tr>
          </tfoot>
        </table>`.trim();

      // Text produse pentru șablonul tău
      const produseText = cart.map(i => `• ${i.name} × ${i.qty} = ${money(i.price*i.qty)}`).join("\n");

      // EmailJS – inițializează Public Key
      try { if (window.emailjs) emailjs.init({ publicKey: EJ.publicKey }); } catch(e){}

      // Trimite 2 emailuri (către tine & către client). Dacă EmailJS e restricționat, site-ul merge mai departe.
      try {
        if (window.emailjs) {
          // către tine
          emailjs.send(EJ.serviceId, EJ.tplOwner, {
            tip: data.tip || "Persoană fizică",
            nume: data.nume || "",
            prenume: data.prenume || "",
            email: data.email || "",
            telefon: data.telefon || "",
            judet: data.judet || "",
            oras: data.oras || "",
            codpostal: data.codpostal || "",
            adresa: data.adresa || "",
            firma: data.firma || "",
            cui: data.cui || "",
            mentiuni: data.mentiuni || "",
            produse: produseText,
            subtotal: t.sub.toFixed(2),
            livrare: t.ship.toFixed(2),
            total: t.total.toFixed(2),
            order_id: orderId
          });

          // către client (confirmare)
          emailjs.send(EJ.serviceId, EJ.tplClient, {
            to_email: data.email || "",
            fname: data.nume || "",
            order_id: orderId,
            html_proforma: htmlProforma
          });
        }
      } catch (e) {
        console.warn("EmailJS a eșuat sau este blocat în setări:", e);
      }

      // Golește coșul și redirecționează la pagina ta de mulțumire
      clearCart();
      try { form.reset(); } catch {}
      window.location.href = "multumesc.html";
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ===== API public =====
  window.MSACart = {
    add, removeItem, setQty, clearCart, render, hookCheckout, updateCartCountBadge
  };

  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
