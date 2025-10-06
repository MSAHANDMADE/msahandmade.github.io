/* MSA Handmade — cart.js (unic pentru coș + reduceri + EmailJS) */
(function () {
  // ===== Config general =====
  const STORAGE_KEY   = "msa_cart";
  const DISCOUNT_KEY  = "msa_discount";
  const SHIPPING      = 17; // RON (curier)

  // ===== EmailJS (din contul tău) =====
  const PUBLIC_KEY    = "iSadfb7-TV_89l_6k";
  const SERVICE_ID    = "service_ix0zpp7";
  const TEMPLATE_ADMIN  = "template_13qpqtt"; // către tine
  const TEMPLATE_CLIENT = "template_9yctwor"; // confirmare către client

  // Init EmailJS dacă există SDK-ul
  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch (e) {}
  }

  // ===== Helpers LocalStorage =====
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch (_) { return []; }
  };
  const saveCart = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  };

  const readDiscount = () => {
    try { return JSON.parse(localStorage.getItem(DISCOUNT_KEY) || "{\"pct\":0}"); }
    catch (_) { return { pct: 0 }; }
  };
  const saveDiscount = (obj) => {
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify(obj || { pct: 0 }));
  };

  // ===== Badge (numărul din coș) =====
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (i.qty || 1), 0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // ===== CRUD coș =====
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0) {
      list[i].qty = (list[i].qty || 1) + 1;
    } else {
      list.push({
        id,
        name: name || "",
        price: Number(price) || 0,
        image: image || "",
        qty: 1
      });
    }
    saveCart(list);
    updateCartCountBadge();
    document.dispatchEvent(new CustomEvent("msa:cart:changed"));
  }

  function _getByIndexOrId(indexOrId) {
    const list = readCart();
    if (typeof indexOrId === "number") {
      return { list, idx: indexOrId };
    }
    const idx = list.findIndex(p => p.id === indexOrId);
    return { list, idx };
  }

  function removeFromCart(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) {
      list.splice(idx, 1);
      saveCart(list);
      updateCartCountBadge();
      document.dispatchEvent(new CustomEvent("msa:cart:changed"));
    }
  }

  function clearCart() {
    saveCart([]);
    updateCartCountBadge();
    document.dispatchEvent(new CustomEvent("msa:cart:changed"));
  }

  function increaseQty(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) {
      list[idx].qty = (list[idx].qty || 1) + 1;
      saveCart(list);
      updateCartCountBadge();
      document.dispatchEvent(new CustomEvent("msa:cart:changed"));
    }
  }

  function decreaseQty(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) {
      const q = (list[idx].qty || 1) - 1;
      if (q <= 0) list.splice(idx, 1); else list[idx].qty = q;
      saveCart(list);
      updateCartCountBadge();
      document.dispatchEvent(new CustomEvent("msa:cart:changed"));
    }
  }

  function setQty(indexOrId, v) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) {
      const q = Math.max(1, parseInt(v, 10) || 1);
      list[idx].qty = q;
      saveCart(list);
      updateCartCountBadge();
      document.dispatchEvent(new CustomEvent("msa:cart:changed"));
    }
  }

  // ===== Totale & reduceri =====
  function computeTotals(items) {
    const list = Array.isArray(items) ? items : readCart();
    const subtotal = list.reduce((s, i) => s + (Number(i.price) || 0) * (i.qty || 1), 0);
    const discount = readDiscount();               // { pct: 0..100 }
    const pct = Math.min(100, Math.max(0, Number(discount.pct) || 0));
    const discountValue = subtotal * pct / 100;
    const shipping = list.length ? SHIPPING : 0;
    const total = Math.max(0, subtotal - discountValue) + shipping;
    return { subtotal, shipping, pct, discountValue, total };
  }

  function applyDiscountPct(pct) {
    const p = Math.min(100, Math.max(0, Number(pct) || 0));
    saveDiscount({ pct: p });
    document.dispatchEvent(new CustomEvent("msa:cart:changed"));
    return computeTotals();
  }

  function clearDiscount() {
    saveDiscount({ pct: 0 });
    document.dispatchEvent(new CustomEvent("msa:cart:changed"));
    return computeTotals();
  }

  // ===== Submit comandă (EmailJS) =====
  /**
   * @param {string|HTMLFormElement} formRef - id-ul formularului sau elementul <form>
   * @returns {Promise<boolean>}
   */
  async function submitOrder(formRef) {
    const items = readCart();
    if (!items.length) throw new Error("Empty cart");

    if (!window.emailjs || typeof emailjs.send !== "function") {
      throw new Error("EmailJS missing");
    }

    // Acceptă fie id, fie element
    const formEl = (typeof formRef === "string")
      ? document.getElementById(formRef)
      : formRef;

    if (!formEl || !formEl.tagName || formEl.tagName.toLowerCase() !== "form") {
      throw new Error("FormData: parameter 1 is not of type HTMLFormElement");
    }

    const fd = new FormData(formEl);
    const client = Object.fromEntries(fd.entries());

    // Conținut produse (pt. email)
    const produse = items.map(i => `${i.name} × ${i.qty} (${i.price} RON)`).join("\n");
    const totals = computeTotals(items);
    const order_id = `${Date.now()}-${Math.floor(Math.random()*1e5)}`;

    // Payload comun
    const common = {
      order_id,
      tip: client.tip || "Persoană fizică",
      nume: client.nume || "",
      prenume: client.prenume || "",
      email: client.email || "",
      telefon: client.telefon || "",
      judet: client.judet || "",
      oras: client.oras || "",
      codpostal: client.codpostal || "",
      adresa: client.adresa || "",
      mentiuni: client.mentiuni || "",
      reducere_pct: totals.pct.toString(),
      produse,
      subtotal: totals.subtotal.toFixed(2),
      livrare: totals.shipping.toFixed(2),
      total: totals.total.toFixed(2)
    };

    // Trimite la tine
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, common);
    // Trimite clientului
    if (common.email) {
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, common);
    }

    clearCart();           // golește coșul
    clearDiscount();       // resetează reducerea
    return true;
  }

  // ===== Expunere API global =====
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    increaseQty, decreaseQty, setQty,
    computeTotals, applyDiscountPct, clearDiscount,
    submitOrder,
    updateCartCountBadge
  };

  // ===== Init badge la încărcare pagină =====
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
