/*
==================================
 MSA Handmade — cart.js
==================================
*/
(function () {
  const STORAGE_KEY = "msa_cart";
  const SHIPPING = 17;

  // EmailJS config
  const PUBLIC_KEY = "iSa6fb7-TV_891_6k";
  const SERVICE_ID = "service_ix0zpp7";
  const TEMPLATE_ADMIN = "template_13qpqt";
  const TEMPLATE_CLIENT = "template_9ytcwor";

  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch (e) {}
  }

  // Storage
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  };

  const saveCart = (list) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  // Badge
  function updateCartCountBadge() {
    const cart = readCart();
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
    const badgeEls = [document.getElementById("cart-count"), document.getElementById("cart-count-fab")];
    badgeEls.forEach((el) => { if (el) el.textContent = count; });
  }

  // CRUD
  function addToCart(id, name, price, image) {
    const cart = readCart();
    const i = cart.findIndex((p) => p.id === id);
    if (i > -1) cart[i].qty += 1;
    else cart.push({ id, name, price, image, qty: 1 });
    saveCart(cart);
    updateCartCountBadge();
  }

  function removeFromCart(id) {
    const cart = readCart().filter((p) => p.id !== id);
    saveCart(cart);
    updateCartCountBadge();
  }

  function clearCart() {
    saveCart([]);
    updateCartCountBadge();
  }

  function increaseQty(id) {
    const cart = readCart();
    const item = cart.find((p) => p.id === id);
    if (item) item.qty++;
    saveCart(cart);
    updateCartCountBadge();
  }

  function decreaseQty(id) {
    const cart = readCart();
    const item = cart.find((p) => p.id === id);
    if (item) item.qty = Math.max(1, item.qty - 1);
    saveCart(cart);
    updateCartCountBadge();
  }

  function computeTotals(list) {
    const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = list.length ? SHIPPING : 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  }

  // Submit comanda
  async function submitOrder(formData) {
    const items = readCart();
    if (!items.length) throw new Error("Coșul este gol");

    const data = Object.fromEntries(formData.entries());
    const produse = items
      .map((i) => `${i.name} × ${i.qty} — ${i.price * i.qty} RON`)
      .join("\n");

    const t = computeTotals(items);

    const payload = {
      order_id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      data: new Date().toLocaleString("ro-RO"),
      client: data.nume || "",
      email: data.email || "",
      telefon: data.telefon || "",
      adresa: data.adresa || "",
      produse,
      subtotal: t.subtotal,
      livrare: t.shipping,
      total: t.total
    };

    // Trimite la tine
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
    // Trimite clientului
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, payload);

    clearCart();
    return true;
  }

  // Expune API global
  window.MSACart = {
    readCart,
    saveCart,
    addToCart,
    removeFromCart,
    increaseQty,
    decreaseQty,
    computeTotals,
    updateCartCountBadge,
    submitOrder
  };

  // Actualizează automat coșul pe orice pagină
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
