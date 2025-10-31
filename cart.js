/* =========================================================
   MSA Handmade — cart.js (stabil)
   LocalStorage + randare coș + badge + reduceri + livrare
   EmailJS: service_ix0zpp7 • template_9yctwor • PublicKey iSadfb7-TV_89l_6k
   ========================================================= */
(function () {
  const LS_KEY = "msa_cart_v1";

  // Reguli comerciale
  const rules = {
    shippingFlat: 17,          // cost standard livrare
    freeShipFromSubtotal: 300, // prag livrare gratuită calculat pe SUBTOTAL (înainte de discount)
    discounts: [
      { min: 400, pct: 0.20 },
      { min: 300, pct: 0.15 },
      { min: 200, pct: 0.10 },
    ],
  };

  // ---------- Utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => `${(Number(n) || 0).toFixed(2)} RON`;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

  const findIndex = (cart, id) => cart.findIndex(i => i.id === id);

  // ---------- Core ----------
  function add(item, qty = 1) {
    const cart = read();
    const i = findIndex(cart, item.id);
    if (i >= 0) {
      cart[i].qty += qty;
    } else {
      cart.push({
        id: String(item.id),
        name: String(item.name || ""),
        price: Number(item.price) || 0,
        image: item.image || "",
        qty: Number(qty) || 1,
      });
    }
    write(cart);
    updateCartCountBadge();
    return cart;
  }
  // alias compatibilitate vechi
  const addToCart = add;

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

  function clearCart() {
    write([]);
    updateCartCountBadge();
  }

  // Totale: livrare 0 dacă SUBTOTAL >= 300 (indiferent de discount)
  function totals(cart) {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);

    let disc = 0;
    for (const r of rules.discounts) {
      if (sub >= r.min) { disc = sub * r.pct; break; } // cel mai mare prag
    }

    const afterDisc = sub - disc;

    const ship =
      sub === 0 ? 0 :
      sub >= rules.freeShipFromSubtotal ? 0 :
      rules.shippingFlat;

    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  // ---------- Badge ----------
  function updateCartCountBadge() {
    const count = read().reduce((s, i) => s + i.qty, 0);
    const el = document.getElementById("cart-count");
    if (el) el.textContent = String(count);
  }

  // ---------- Render coș (cos.html) ----------
  function render() {
    const body = $("#cart-body");
    if (!body) return; // nu suntem în cos.html
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
          <div class="qty" role="group" aria-label="Cantitate" style="max-width:128px">
            <button class="qminus" type="button" aria-label="Scade">−</button>
            <input class="qinput" inputmode="numeric" value="${i.qty}">
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
    $all(".qminus").forEach(btn => {
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        const input = $(".qinput", tr);
        const next = Math.max(0, Number(input.value || 0) - 1);
        input.value = next;
        setQty(id, next);
        rerenderRow(tr);
      });
    });
    // plus
    $all(".qplus").forEach(btn => {
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        const input = $(".qinput", tr);
        const next = Math.max(0, Number(input.value || 0) + 1);
        input.value = next;
        setQty(id, next);
        rerenderRow(tr);
      });
    });
    // input direct
    $all(".qinput").forEach(inp => {
      inp.addEventListener("change", () => {
        const tr = inp.closest("tr"); const id = tr.dataset.id;
        const val = Math.max(0, Number(inp.value || 0));
        inp.value = val;
        setQty(id, val);
        rerenderRow(tr);
      });
    });
    // delete
    $all(".qdel").forEach(btn => {
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr"); const id = tr.dataset.id;
        removeFromCart(id);
        tr.remove();
        if (read().length === 0) render(); else paintTotals(totals(read()));
      });
    });
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
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = typeof val === "number" ? money(val) : val; };
    set("t-sub", t.sub);
    set("t-disc", t.disc);
    set("t-ship", t.ship);
    set("t-total", t.total);
  }

  // ---------- Checkout + EmailJS ----------
  function hookCheckout(formSel, submitBtnSel) {
    const form = $(formSel);
    const btn  = $(submitBtnSel);
    if (!form || !btn) return;

    // ascunde câmpurile Firmă/CUI când e Persoană fizică (dacă există)
    const tipRadios = form.querySelectorAll('input[name="tip"]');
    const firmaRow = form.querySelector('input[name="firma"]')?.closest(".row") || form.querySelector('input[name="firma"]')?.parentElement;
    const cuiRow   = form.querySelector('input[name="cui"]')?.closest(".row")   || form.querySelector('input[name="cui"]')?.parentElement;
    function toggleCompany() {
      const tip = form.querySelector('input[name="tip"]:checked')?.value || "Persoană fizică";
      const pj = /juridic/i.test(tip);
      if (firmaRow) firmaRow.style.display = pj ? "" : "none";
      if (cuiRow)   cuiRow.style.display   = pj ? "" : "none";
    }
    tipRadios.forEach(r => r.addEventListener("change", toggleCompany));
    toggleCompany();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cart = read();
      if (!cart.length) { alert("Coșul este gol."); return; }

      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const t = totals(cart);

      // pregătește detalii pentru template
      const orderId = Date.now().toString().slice(-7);
      const produseText = cart.map(i => `• ${i.name} — ${i.qty} × ${i.price} RON = ${(i.qty*i.price).toFixed(2)} RON`).join("\n");

      const htmlRows = cart.map(i => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.name}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(i.price)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(i.price*i.qty)}</td>
        </tr>
      `).join("");

      const html_proforma = `
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th align="left"  style="padding:6px 8px;border-bottom:2px solid #222">Produs</th>
              <th align="center"style="padding:6px 8px;border-bottom:2px solid #222">Cant.</th>
              <th align="right" style="padding:6px 8px;border-bottom:2px solid #222">Preț</th>
              <th align="right" style="padding:6px 8px;border-bottom:2px solid #222">Total</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
          <tfoot>
            <tr><td colspan="3" align="right" style="padding:6px 8px">Subtotal</td><td align="right" style="padding:6px 8px">${money(t.sub)}</td></tr>
            <tr><td colspan="3" align="right" style="padding:6px 8px">Reducere</td><td align="right" style="padding:6px 8px">${money(t.disc)}</td></tr>
            <tr><td colspan="3" align="right" style="padding:6px 8px">Livrare</td><td align="right" style="padding:6px 8px">${money(t.ship)}</td></tr>
            <tr><td colspan="3" align="right" style="padding:8px 8px;border-top:2px solid #222"><b>Total</b></td><td align="right" style="padding:8px 8px;border-top:2px solid #222"><b>${money(t.total)}</b></td></tr>
          </tfoot>
        </table>
      `;

      // Trimite emailuri cu EmailJS (client-side)
      try {
        if (window.emailjs) {
          emailjs.init({ publicKey: "iSadfb7-TV_89l_6k" });

          // 1) către client — template_9yctwor (Order Confirmation)
          await emailjs.send("service_ix0zpp7", "template_9yctwor", {
            to_email: data.email,            // câmpul "To Email" din template
            order_id: orderId,
            nume: data.nume || "",
            prenume: data.prenume || "",
            tip: data.tip || "Persoană fizică",
            email: data.email || "",
            telefon: data.telefon || "",
            judet: data.judet || "",
            oras: data.oras || "",
            adresa: data.adresa || "",
            firma: data.firma || "",
            cui: data.cui || "",
            mentiuni: data.mentiuni || "",
            subtotal: t.sub.toFixed(2),
            livrare: t.ship.toFixed(2),
            total: t.total.toFixed(2),
            produse: produseText,
            html_proforma
          });

          // 2) către magazin — aceeași machetă, dar către adresa ta
          await emailjs.send("service_ix0zpp7", "template_9yctwor", {
            to_email: "msahandmade.contact@gmail.com",
            order_id: orderId,
            nume: data.nume || "",
            prenume: data.prenume || "",
            tip: data.tip || "Persoană fizică",
            email: data.email || "",
            telefon: data.telefon || "",
            judet: data.judet || "",
            oras: data.oras || "",
            adresa: data.adresa || "",
            firma: data.firma || "",
            cui: data.cui || "",
            mentiuni: data.mentiuni || "",
            subtotal: t.sub.toFixed(2),
            livrare: t.ship.toFixed(2),
            total: t.total.toFixed(2),
            produse: produseText,
            html_proforma
          });
        }
      } catch (err) {
        console.warn("EmailJS a returnat o eroare:", err);
        // Continui fără să blochez checkout-ul
      }

      // finalizează
      clearCart();
      try { form.reset(); } catch {}
      // redirect la pagina de mulțumire
      window.location.href = "multumesc.html";
    });
  }

  // ---------- API public ----------
  window.MSACart = {
    add,            // nou
    addToCart,      // alias vechi
    removeFromCart,
    setQty,
    clearCart,
    totals,
    render,
    hookCheckout,
    updateCartCountBadge
  };

  // Auto-init badge pe orice pagină
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
