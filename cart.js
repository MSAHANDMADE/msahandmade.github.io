/* ===============================
   MSA Handmade — cart.js complet
================================*/

(function () {
  const STORAGE_KEY = "msa_cart";
  const SHIPPING = 17;

  // ====== EmailJS Config ======
  const PUBLIC_KEY      = "iSadfb7-TV_89l_6k";
  const SERVICE_ID      = "service_ix0zpp7";
  const TEMPLATE_ADMIN  = "template_13qpqtt"; // către tine
  const TEMPLATE_CLIENT = "template_9ytcwor"; // către client

  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch(e) { console.warn(e); }
  }

  // ====== Local Storage ======
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  };

  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  // ====== Badge ======
  function updateCartCountBadge() {
    const cart = readCart();
    const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
    const el = document.getElementById("cart-count");
    if (el) el.textContent = count;
  }

  // ====== CRUD ======
  function addToCart(id, name, price, image) {
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    if (i > -1) list[i].qty += 1;
    else list.push({ id, name, price, image, qty: 1 });
    saveCart(list);
    updateCartCountBadge();
  }

  function removeFromCart(id) {
    const list = readCart().filter(p => p.id !== id);
    saveCart(list);
    updateCartCountBadge();
  }

  function clearCart() {
    saveCart([]);
    updateCartCountBadge();
  }

  function computeTotals(list) {
    const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
    return { subtotal, shipping: SHIPPING, total: subtotal + SHIPPING };
  }

  // ====== Trimite Comanda ======
  async function submitOrder(formData) {
    const items = readCart();
    if (!items.length) throw new Error("Coșul este gol!");
    if (!window.emailjs) throw new Error("EmailJS lipsă!");

    const data = Object.fromEntries(formData.entries());
    const produse = items.map(i => `${i.name} × ${i.qty} — ${i.price} RON`).join("\n");
    const totals = computeTotals(items);
    const order_id = `${Date.now()}-${Math.floor(Math.random()*100000)}`;

    const payload = {
      order_id,
      tip: data.tip || "Persoană fizică",
      nume: `${data.prenume || ""} ${data.nume || ""}`,
      email: data.email || "",
      telefon: data.telefon || "",
      judet: data.judet || "",
      oras: data.oras || "",
      codpostal: data.codpostal || "",
      adresa: data.adresa || "",
      mentiuni: data.mentiuni || "",
      produse,
      subtotal: totals.subtotal,
      livrare: totals.shipping,
      total: totals.total
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, payload);
      clearCart();
      alert("Comanda a fost trimisă cu succes! Mulțumim 💛");
      return true;
    } catch (err) {
      console.error("EmailJS error:", err);
      alert("Eroare la trimiterea comenzii. Verifică datele EmailJS.");
      return false;
    }
  }

  // ====== Expune funcțiile ======
  window.MSACart = { readCart, saveCart, addToCart, removeFromCart, clearCart, computeTotals, submitOrder };
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
