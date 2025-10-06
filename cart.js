/* MSA Handmade — cos + reduceri automate + EmailJS + PF/PJ */
/* TOT codul într-un IIFE și expune MSACart global */
(function () {
  "use strict";

  /* ==== CONFIG ==== */
  const STORAGE_KEY = "msa_cart";
  const SHIPPING_BASE = 17;

  // Cheile tale (LE AI DEJA CORECTE – modifică doar dacă le-ai schimbat)
  const PUBLIC_KEY = "iSadfb7-TV_89l_6k";
  const SERVICE_ID = "service_ix0zpp7";
  const TEMPLATE_ADMIN = "template_13qpqtt"; // spre tine
  const TEMPLATE_CLIENT = "template_9yctwor"; // spre client

  // Inițializează EmailJS dacă e disponibil (SDK-ul e în cos.html)
  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch (e) {}
  }

  /* ==== Helpers STORAGE ==== */
  function readCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }
  function saveCart(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  }

  /* ==== Badge cart (header) ==== */
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (parseInt(i.qty)||1), 0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  /* ==== CRUD ==== */
  // Protecție anti-dublare: ignoră două add-uri în <450ms>
  let _lastAdd = { id: null, t: 0 };

  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const now = Date.now();
    if (_lastAdd.id === id && now - _lastAdd.t < 450) return; // anti dublu-click/ dublu-listener
    _lastAdd = { id, t: now };

    const list = readCart();
    const idx = list.findIndex(p => p.id === id);
    const p = Number(price) || 0;

    if (idx > -1) {
      list[idx].qty = (parseInt(list[idx].qty)||1) + 1;
      if (name)  list[idx].name  = name;
      if (image) list[idx].image = image;
      if (p)     list[idx].price = p;
    } else {
      list.push({ id, name: name||"", price: p, image: image||"", qty: 1 });
    }
    saveCart(list);
    updateCartCountBadge();
  }

  function removeFromCart(indexOrId) {
    const list = readCart();
    const idx = (typeof indexOrId === "number")
      ? indexOrId
      : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) {
      list.splice(idx, 1);
      saveCart(list);
      updateCartCountBadge();
    }
  }

  function clearCart() {
    saveCart([]);
    updateCartCountBadge();
  }

  function setQty(indexOrId, v) {
    const list = readCart();
    const idx = (typeof indexOrId === "number")
      ? indexOrId
      : list.findIndex(p => p.id === indexOrId);
    if (idx > -1) {
      const q = Math.max(1, parseInt(v) || 1);
      list[idx].qty = q;
      saveCart(list);
    }
  }

  /* ==== Reduceri + totaluri ==== */
  function computeTotals(list) {
    const subtotal = list.reduce((s, i) => s + (Number(i.price)||0) * (Number(i.qty)||1), 0);
    let pct = 0;
    let shipping = SHIPPING_BASE;

    if (subtotal >= 400) { pct = 20; shipping = 0; }
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) { pct = 10; }

    const discount = +(subtotal * pct / 100).toFixed(2);
    const total = +(subtotal - discount + shipping).toFixed(2);

    return { subtotal:+subtotal.toFixed(2), discount, shipping, pct, total };
  }

  const fmt = n => (Number(n)||0).toFixed(2);

  /* ==== Render cos (cos.html) ==== */
  function renderCartPage() {
    const mount = document.getElementById("items");
    if (!mount) { updateCartCountBadge(); return; }

    const list = readCart();
    const totals = computeTotals(list);

    const subEl = document.getElementById("subtot");
    const disEl = document.getElementById("disc");
    const shipEl= document.getElementById("ship");
    const totEl = document.getElementById("grand");

    if (subEl) subEl.textContent = fmt(totals.subtotal) + " RON";
    if (disEl) disEl.textContent = fmt(totals.discount) + " RON";
    if (shipEl) shipEl.textContent = fmt(totals.shipping) + " RON";
    if (totEl) totEl.textContent = fmt(totals.total) + " RON";

    mount.innerHTML = "";

    if (!list.length) {
      mount.innerHTML = `<p>Coșul tău este gol.</p>`;
      return;
    }

    list.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "cart-card";
      card.innerHTML = `
        <div class="cart-left">
          <img src="${p.image || "logo.png"}" alt="${escapeHtml(p.name || "")}">
        </div>
        <div class="cart-mid">
          <h3>${escapeHtml(p.name || "")}</h3>
          <div class="price">${fmt(p.price)} RON</div>
          <div class="qty-row">
            <button class="btn-qty" data-act="dec" data-idx="${idx}">−</button>
            <input class="qty" data-idx="${idx}" type="number" min="1" value="${p.qty||1}">
            <button class="btn-qty" data-act="inc" data-idx="${idx}">+</button>
            <button class="btn-del" data-idx="${idx}">Șterge</button>
          </div>
        </div>
      `;
      mount.appendChild(card);
    });

    // listeners unice
    mount.querySelectorAll(".btn-qty").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        const act = btn.dataset.act;
        const list = readCart();
        if (!list[idx]) return;
        let q = parseInt(list[idx].qty)||1;
        q = act === "inc" ? q+1 : Math.max(1, q-1);
        list[idx].qty = q;
        saveCart(list);
        renderCartPage();
      }, { once:false });
    });

    mount.querySelectorAll(".qty").forEach(inp => {
      inp.addEventListener("change", () => {
        const idx = parseInt(inp.dataset.idx);
        setQty(idx, inp.value);
        renderCartPage();
      }, { once:false });
    });

    mount.querySelectorAll(".btn-del").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        removeFromCart(idx);
        renderCartPage();
      }, { once:false });
    });

    const clearBtn = document.getElementById("clear");
    if (clearBtn && !clearBtn._msaBound) {
      clearBtn._msaBound = true;
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearCart();
        renderCartPage();
      });
    }

    updateCartCountBadge();
  }

  /* ==== PF / PJ – câmpuri extra pentru PJ ==== */
  function setupPJFields() {
    const form = document.getElementById("order-form");
    if (!form) return;

    const radios = form.querySelectorAll('input[name="tip"]');
    const pjBox = document.getElementById("pj-extra");
    function sync() {
      const val = (form.querySelector('input[name="tip"]:checked')||{}).value;
      const isPJ = val === "juridica";
      if (pjBox) pjBox.style.display = isPJ ? "block" : "none";
    }
    radios.forEach(r => r.addEventListener("change", sync));
    sync();
  }

  /* ==== Trimitere comanda (EmailJS) ==== */
  function setupOrderSubmit() {
    const form = document.getElementById("order-form");
    if (!form || form._msaBound) return;
    form._msaBound = true;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const list = readCart();
      if (!list.length) { alert("Coșul este gol."); return; }

      // date client
      const tip = (form.querySelector('input[name="tip"]:checked')||{}).value || "fizica";
      const nume = (form.querySelector("#nume")||{}).value || "";
      const prenume = (form.querySelector("#prenume")||{}).value || "";
      const email = (form.querySelector("#email")||{}).value || "";
      const telefon = (form.querySelector("#telefon")||{}).value || "";
      const judet = (form.querySelector("#judet")||{}).value || "";
      const oras = (form.querySelector("#oras")||{}).value || "";
      const codpostal = (form.querySelector("#codpostal")||{}).value || "";
      const adresa = (form.querySelector("#adresa")||{}).value || "";
      const mentiuni = (form.querySelector("#mentiuni")||{}).value || "";

      // PJ
      const firma = (form.querySelector("#firma")||{}).value || "";
      const cui = (form.querySelector("#cui")||{}).value || "";
      const regcom = (form.querySelector("#regcom")||{}).value || "";

      // totaluri
      const totals = computeTotals(list);

      // sumar produse
      const itemsText = list.map(i =>
        `• ${i.name} × ${i.qty} — ${fmt(i.price)} RON`
      ).join("\n");

      // parametri pentru sabloane
      const params = {
        tip_client: tip === "juridica" ? "Persoană juridică" : "Persoană fizică",
        nume, prenume, email, telefon, judet, oras, codpostal, adresa, mentiuni,
        firma, cui, regcom,
        subtotal: fmt(totals.subtotal),
        reducere: fmt(totals.discount),
        livrare: fmt(totals.shipping),
        total: fmt(totals.total),
        produse: itemsText
      };

      // verifică disponibilitatea EmailJS
      if (!(window.emailjs && emailjs.send)) {
        alert("EmailJS indisponibil. Verifică scriptul din cos.html.");
        return;
      }

      try {
        // trimite la admin
        await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, params);
        // trimite la client (dacă are email valid)
        if (email) {
          await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, params);
        }
        clearCart();
        window.location.href = "multumesc.html";
      } catch (err) {
        console.error(err);
        alert("Eroare la trimitere comanda.");
      }
    });
  }

  /* ==== Utils ==== */
  function escapeHtml(str) {
    return String(str||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  /* ==== Init pe orice pagină ==== */
  function init() {
    updateCartCountBadge();
    renderCartPage();
    setupPJFields();
    setupOrderSubmit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ==== Expune API-ul global pentru produse.html ==== */
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart, setQty,
    updateCartCountBadge
  };
})();
