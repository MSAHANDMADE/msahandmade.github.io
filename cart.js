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

  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => `${(Number(n) || 0).toFixed(2)} RON`;

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

  const findIndex = (cart, id) => cart.findIndex((i) => i.id === id);

  function addToCart(item, qty = 1) {
    const cart = read();
    const i = findIndex(cart, item.id);
    if (i >= 0) {
      cart[i].qty += qty;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        image: item.image || "",
        qty: Number(qty) || 1,
      });
    }
    write(cart);
    updateCartCountBadge();
    return cart;
  }

  function removeFromCart(id) {
    const cart = read().filter((i) => i.id !== id);
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

  function totals(cart) {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let disc = 0;
    for (const r of rules.discounts) {
      if (sub >= r.min) {
        disc = sub * r.pct;
        break;
      }
    }
    const afterDisc = sub - disc;
    const ship =
      sub >= rules.freeShipFrom || sub === 0 ? 0 : rules.shippingFlat;
    const total = afterDisc + ship;
    return { sub, disc, ship, total };
  }

  function updateCartCountBadge() {
    const count = read().reduce((s, i) => s + i.qty, 0);
    const el = $("#cart-count");
    if (el) el.textContent = count;
  }

  function render() {
    const body = $("#cart-body");
    if (!body) return;
    const cart = read();

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ sub: 0, disc: 0, ship: rules.shippingFlat, total: rules.shippingFlat });
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
          <div class="qty">
            <button class="qminus">−</button>
            <input class="qinput" value="${i.qty}" />
            <button class="qplus">+</button>
          </div>
        </td>
        <td class="line-total">${money(line)}</td>
        <td><button class="qdel btn ghost">✕</button></td>
      </tr>
    `;
  }

  function bindRowEvents() {
    $all(".qminus").forEach((btn) =>
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const input = $(".qinput", tr);
        const next = Math.max(0, Number(input.value || 0) - 1);
        input.value = next;
        setQty(id, next);
        rerenderRow(tr);
      })
    );

    $all(".qplus").forEach((btn) =>
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const input = $(".qinput", tr);
        const next = Math.max(0, Number(input.value || 0) + 1);
        input.value = next;
        setQty(id, next);
        rerenderRow(tr);
      })
    );

    $all(".qinput").forEach((inp) =>
      inp.addEventListener("change", () => {
        const tr = inp.closest("tr");
        const id = tr.dataset.id;
        const val = Math.max(0, Number(inp.value || 0));
        inp.value = val;
        setQty(id, val);
        rerenderRow(tr);
      })
    );

    $all(".qdel").forEach((btn) =>
      btn.addEventListener("click", () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        removeFromCart(id);
        tr.remove();
        if (read().length === 0) render();
        else paintTotals(totals(read()));
      })
    );
  }

  function rerenderRow(tr) {
    const id = tr.dataset.id;
    const cart = read();
    const item = cart.find((x) => x.id === id);
    if (!item) {
      tr.remove();
      render();
      return;
    }
    $(".line-total", tr).textContent = money(item.price * item.qty);
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

  function hookCheckout(formSel) {
    const form = $(formSel);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cart = read();
      if (!cart.length) {
        alert("Coșul este gol.");
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const t = totals(cart);
      const orderId = genOrderId();

      const produseText = cart
        .map(
          (i) =>
            `• ${i.name} × ${i.qty} @ ${money(i.price)} = ${money(
              i.qty * i.price
            )}`
        )
        .join("\n");

      const proformaHTML = `
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr><th style="text-align:left;border-bottom:1px solid #eee;">Produs</th>
            <th style="text-align:right;border-bottom:1px solid #eee;">Cant.</th>
            <th style="text-align:right;border-bottom:1px solid #eee;">Preț</th>
            <th style="text-align:right;border-bottom:1px solid #eee;">Total</th></tr>
          </thead>
          <tbody>
            ${cart
              .map(
                (i) => `
              <tr>
                <td>${i.name}</td>
                <td style="text-align:right;">${i.qty}</td>
                <td style="text-align:right;">${money(i.price)}</td>
                <td style="text-align:right;">${money(i.qty * i.price)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr><td colspan="3" style="text-align:right;"><b>Subtotal</b></td><td style="text-align:right;">${money(
              t.sub
            )}</td></tr>
            <tr><td colspan="3" style="text-align:right;">Reducere</td><td style="text-align:right;">${money(
              t.disc
            )}</td></tr>
            <tr><td colspan="3" style="text-align:right;">Livrare</td><td style="text-align:right;">${money(
              t.ship
            )}</td></tr>
            <tr><td colspan="3" style="text-align:right;"><b>Total</b></td><td style="text-align:right;"><b>${money(
              t.total
            )}</b></td></tr>
          </tfoot>
        </table>`;

      try {
        if (window.emailjs) {
          const SERVICE = "service_ix0zpp7";
          const TEMPLATE_CONFIRM = "template_9yctwor";
          const TEMPLATE_STORE = "template_13qpqtt";
          const PUBLIC_KEY = "iSadfb7-TV_89l_6k";

          emailjs.init({ publicKey: PUBLIC_KEY });

          await emailjs.send(SERVICE, TEMPLATE_CONFIRM, {
            to_email: data.email || "",
            order_id: orderId,
            nume: data.nume || "",
            html_proforma: proformaHTML,
          });

          await emailjs.send(SERVICE, TEMPLATE_STORE, {
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
            produse: produseText,
            subtotal: t.sub.toFixed(2),
            livrare: t.ship.toFixed(2),
            total: t.total.toFixed(2),
            mentiuni: data.mentiuni || "",
            firma: data.firma || "",
            cui: data.cui || "",
          });
        }
      } catch (e) {
        console.warn("EmailJS eroare:", e);
      }

      clearCart();
      window.location.href = "multumesc.html";
    });
  }

  function genOrderId() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let s = "";
    for (let i = 0; i < 6; i++)
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  }

  window.MSACart = {
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    render,
    hookCheckout,
    updateCartCountBadge,
  };

  document.addEventListener("DOMContentLoaded", () => {
    updateCartCountBadge();
    if (document.getElementById("cart-body")) render();
  });
})();
