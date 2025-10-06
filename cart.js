/* MSA Handmade — cart.js (versiune stabilă) */
(function () {
  const STORAGE_KEY = "msa_cart";
  const SHIPPING = 17;

  // EmailJS (cheile tale din screenshot)
  const PUBLIC_KEY  = "iSadfb7-TV_89l_6k";
  const SERVICE_ID  = "service_ix0zpp7";
  const TEMPLATE_ADMIN  = "template_13qpqtt";  // către tine
  const TEMPLATE_CLIENT = "template_9yctwor";  // către client

  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch(_) {}
  }

  /* --- storage --- */
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));

  /* --- badge --- */
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (i.qty || 1), 0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  /* --- CRUD --- */
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0) {
      list[i].qty = (list[i].qty || 1) + 1;
      // dacă n-am avut imagine/denumire/preț, completează acum
      list[i].name  = list[i].name  || name  || "";
      list[i].price = Number(list[i].price ?? price ?? 0);
      list[i].image = list[i].image || image || "";
    } else {
      list.push({
        id,
        name: name || "",
        price: Number(price || 0),
        image: image || "",
        qty: 1
      });
    }
    saveCart(list);
    updateCartCountBadge();
    document.dispatchEvent(new CustomEvent("msa:added", { detail: { id, name } }));
  }

  function removeFromCart(id) {
    const list = readCart().filter(p => p.id !== id);
    saveCart(list); updateCartCountBadge();
  }

  function clearCart() { saveCart([]); updateCartCountBadge(); }

  function increaseQty(id) {
    const list = readCart(); const it = list.find(p => p.id === id);
    if (it) { it.qty = (it.qty || 1) + 1; saveCart(list); updateCartCountBadge(); }
  }
  function decreaseQty(id) {
    const list = readCart(); const it = list.find(p => p.id === id);
    if (it) {
      it.qty = Math.max(1, (it.qty || 1) - 1);
      saveCart(list); updateCartCountBadge();
    }
  }
  function setQty(id, v) {
    v = parseInt(v, 10); if (isNaN(v) || v < 1) v = 1;
    const list = readCart(); const it = list.find(p => p.id === id);
    if (it) { it.qty = v; saveCart(list); updateCartCountBadge(); }
  }

  function computeTotals(list) {
    const subtotal = (list || readCart()).reduce(
      (s, i) => s + Number(i.price || 0) * (i.qty || 1), 0
    );
    const shipping = (list && list.length) ? SHIPPING : 0;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  /* --- submit via EmailJS --- */
  async function submitOrder(formData) {
    const items = readCart();
    if (!items.length) throw new Error("Coșul este gol.");
    if (!window.emailjs) throw new Error("EmailJS indisponibil.");

    const produse = items
      .map(i => `${i.name} × ${i.qty} — ${Number(i.price).toFixed(2)} RON`)
      .join("\n");
    const t = computeTotals(items);

    const data = Object.fromEntries(formData.entries());
    const order_id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const payload = {
      order_id,
      tip: data.tip || "Persoană fizică",
      nume: (data.nume || "").trim(),
      prenume: (data.prenume || "").trim(),
      email: (data.email || "").trim(),
      telefon: (data.telefon || "").trim(),
      judet: (data.judet || "").trim(),
      oras: (data.oras || "").trim(),
      codpostal: (data.codpostal || "").trim(),
      adresa: (data.adresa || "").trim(),
      mentiuni: (data.mentiuni || "").trim(),
      produse,
      subtotal: t.subtotal.toFixed(2) + " RON",
      livrare: t.shipping.toFixed(2) + " RON",
      total: t.total.toFixed(2) + " RON"
    };

    // 1) către tine
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
    // 2) confirmare către client (dacă are email)
    if (payload.email) {
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, { ...payload, to_email: payload.email });
    }

    clearCart();
    return true;
  }

  /* expune API global */
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    increaseQty, decreaseQty, setQty,
    computeTotals, submitOrder,
    updateCartCountBadge
  };

  // inițializează badge la încărcare
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) updateCartCountBadge();
  });
})();
