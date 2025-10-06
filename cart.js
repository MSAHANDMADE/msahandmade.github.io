/* MSA Handmade – cart.js (unic pentru coș + binding + reduceri + email) */
(function () {
  // === Constante ===
  const STORAGE_KEY  = "msa_cart";
  const DISCOUNT_KEY = "msa_discount";
  const SHIPPING     = 17;

  // === EmailJS (păstrează exact valorile tale) ===
  const PUBLIC_KEY     = "iSadfb7-TV_89l_6k";
  const SERVICE_ID     = "service_ix0zpp7";
  const TEMPLATE_ADMIN = "template_13qpqtt";  // către tine
  const TEMPLATE_CLIENT= "template_9yctwor";  // către client

  // inițializează EmailJS dacă există
  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch(e) {}
  }

  // === LocalStorage helpers ===
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch (_) { return []; }
  };
  const saveCart = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  };

  const readDiscount = () => {
    try { return JSON.parse(localStorage.getItem(DISCOUNT_KEY) || "{\"code\":\"\",\"pct\":0}"); }
    catch (_) { return { code:"", pct:0 }; }
  };
  const saveDiscount = (obj) => {
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify(obj || {code:"", pct:0}));
  };

  // === Badge ===
  function updateCartCountBadge() {
    const list  = readCart();
    const count = list.reduce((s,i)=> s + (i.qty||1), 0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CRUD coș ===
  function addToCart(item) {
    // item = { id, name, price, image }
    if (!item || !item.id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === item.id);

    if (i >= 0) {
      // dacă există deja -> crește cantitatea cu 1 (NU dublu)
      list[i].qty = (list[i].qty || 1) + 1;
      // asigură atributele
      list[i].name  = list[i].name  || item.name  || "";
      list[i].price = Number(list[i].price ?? item.price ?? 0) || 0;
      list[i].image = list[i].image || item.image || "";
    } else {
      list.push({
        id: item.id,
        name: item.name || "",
        price: Number(item.price) || 0,
        image: item.image || "",
        qty: 1
      });
    }
    saveCart(list);
    updateCartCountBadge();
    // declanșează eveniment – dacă vrei să “asculți” în UI
    document.dispatchEvent(new CustomEvent("msa:added", { detail: { id:item.id, name:item.name }}));
  }

  function _getByIndexOrId(indexOrId) {
    const list = readCart();
    if (typeof indexOrId === "number") return { list, idx: indexOrId };
    const idx = list.findIndex(p => p.id === indexOrId);
    return { list, idx };
  }

  function removeFromCart(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx > -1) {
      list.splice(idx, 1);
      saveCart(list);
      updateCartCountBadge();
      renderCartPage(); // re-randează pagina coș (dacă suntem acolo)
    }
  }

  function clearCart() {
    saveCart([]);
    updateCartCountBadge();
  }

  function increaseQty(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx > -1) {
      list[idx].qty = Math.max(1, (list[idx].qty||1) + 1);
      saveCart(list);
      renderCartPage();
    }
  }

  function decreaseQty(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx > -1) {
      list[idx].qty = Math.max(1, (list[idx].qty||1) - 1);
      saveCart(list);
      renderCartPage();
    }
  }

  // === Totaluri + reducere ===
  function computeTotals(list) {
    const disc = readDiscount(); // {code,pct}
    const subtotal = list.reduce((s,i)=> s + (Number(i.price||0) * (i.qty||1)), 0);
    const reducere = Math.round(subtotal * (disc.pct||0) ) / 100; // pct = 10 => 10%
    const shipping = list.length ? SHIPPING : 0;
    const total = Math.max(0, subtotal - reducere) + shipping;
    return { subtotal, reducere, shipping, total, disc };
  }

  // === Cupon reducere ===
  function tryApplyCoupon(code) {
    const c = (code||"").trim().toUpperCase();
    let pct = 0;
    if (c === "MSA10") pct = 10;
    else if (c === "MSA15") pct = 15;
    else if (c === "MSA20") pct = 20;
    else pct = 0;

    saveDiscount({ code: c, pct });
    renderCartPage();
    return pct;
  }

  // === Rander coș (doar pe cos.html) ===
  function renderCartPage() {
    const wrap = document.getElementById("cart-list");
    const subtotalEl = document.getElementById("subtotal");
    const shippingEl = document.getElementById("shipping");
    const reducereEl = document.getElementById("discount");
    const totalEl = document.getElementById("total");
    const couponInput = document.getElementById("coupon");
    const couponBtn   = document.getElementById("apply-coupon");

    if (!wrap) { updateCartCountBadge(); return; }

    const list = readCart();
    const { subtotal, reducere, shipping, total, disc } = computeTotals(list);

    // listă produse
    wrap.innerHTML = list.map((p, idx)=>`
      <div class="cart-item">
        <img class="thumb" src="${p.image || 'logo.png'}" alt="${(p.name||'')}" />
        <div class="meta">
          <div class="name">${p.name || ''}</div>
          <div class="price">${(p.price||0).toFixed(2)} RON</div>
          <div class="qty">
            <button class="btn btn-qty" data-act="dec" data-idx="${idx}">−</button>
            <input class="qty-input" type="text" value="${p.qty||1}" readonly />
            <button class="btn btn-qty" data-act="inc" data-idx="${idx}">+</button>
          </div>
        </div>
        <button class="btn btn-danger" data-act="del" data-idx="${idx}">Șterge</button>
      </div>
    `).join("") || `<p>Coșul este gol.</p>`;

    // totaluri
    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} RON`;
    if (shippingEl) shippingEl.textContent = `${shipping.toFixed(2)} RON`;
    if (reducereEl) reducereEl.textContent = `-${reducere.toFixed(2)} RON (${disc.pct||0}%)`;
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} RON`;

    // set input cupon
    if (couponInput) couponInput.value = disc.code || "";

    // bind butoane
    wrap.querySelectorAll("[data-act]").forEach(btn=>{
      const act = btn.getAttribute("data-act");
      const idx = Number(btn.getAttribute("data-idx"));
      btn.addEventListener("click", ()=>{
        if (act === "del")      removeFromCart(idx);
        else if (act === "inc") increaseQty(idx);
        else if (act === "dec") decreaseQty(idx);
      });
    });

    if (couponBtn && couponInput) {
      couponBtn.onclick = ()=>{
        const pct = tryApplyCoupon(couponInput.value);
        const msg = document.getElementById("coupon-msg");
        if (msg) msg.textContent = pct ? `Reducere aplicată: ${pct}%` : `Cod invalid`;
      };
    }

    updateCartCountBadge();
  }

  // === Submit comandă (EmailJS) ===
  async function submitOrder(formEl) {
    const items = readCart();
    if (!items.length) { alert("Coșul este gol."); return false; }
    if (!window.emailjs) { alert("EmailJS indisponibil."); return false; }

    const data = Object.fromEntries(new FormData(formEl).entries());
    const totals = computeTotals(items);

    // descriere produse în text
    const produse = items.map(i => `${i.name} × ${i.qty} (${i.price} RON)`).join("\n");

    // subiecte curate (evită „subject subject”)
    const subj_admin  = `MSA – Comandă #${Date.now()}`;
    const subj_client = `MSA Handmade – Confirmarea comenzii`;

    const payload = {
      subject:      subj_admin,
      subject_cli:  subj_client,
      // client
      tip:          data.tip || "Persoană fizică",
      nume:         data.nume || "",
      prenume:      data.prenume || "",
      email:        data.email || "",
      telefon:      data.telefon || "",
      judet:        data.judet || "",
      oras:         data.oras || "",
      codpostal:    data.codpostal || "",
      adresa:       data.adresa || "",
      mentiuni:     data.mentiuni || "",
      // comanda
      produse,
      subtotal:     totals.subtotal.toFixed(2)+" RON",
      reducere:     totals.reducere.toFixed(2)+" RON",
      livrare:      totals.shipping.toFixed(2)+" RON",
      total:        totals.total.toFixed(2)+" RON"
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN,  payload);
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT,{
        ...payload,
        subject: payload.subject_cli
      });
    } catch (e) {
      alert("Eroare la trimitere. Te rugăm încearcă din nou.");
      return false;
    }

    clearCart();
    window.location.href = "multumesc.html";
    return true;
  }

  // === Exportează API global ===
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    increaseQty, decreaseQty,
    computeTotals,
    tryApplyCoupon,
    submitOrder,
    updateCartCountBadge,
    renderCartPage
  };

  // === Inițializări ușoare pe orice pagină ===
  document.addEventListener("DOMContentLoaded", ()=>{
    updateCartCountBadge();

    // dacă suntem pe cos.html -> randează
    if (document.getElementById("cart-list")) {
      renderCartPage();
      const form = document.getElementById("order-form");
      if (form) {
        form.addEventListener("submit", (e)=>{
          e.preventDefault();
          submitOrder(form);
        });
      }
      const btnClear = document.getElementById("btn-clear");
      if (btnClear) btnClear.onclick = ()=> { clearCart(); renderCartPage(); };
    }

    // Butoane “Adaugă în coș” pe alte pagini
    document.querySelectorAll(".add-to-cart").forEach(btn=>{
      if (btn._msaBound) return;
      btn._msaBound = true;
      btn.addEventListener("click", ()=>{
        const d = btn.dataset;
        addToCart({ id:d.id, name:d.name, price:Number(d.price), image:d.image });
        const old = btn.textContent;
        btn.textContent = "Adăugat!";
        setTimeout(()=> btn.textContent = old, 900);
      });
    });
  });
})();
