/* MSA Handmade – cart.js (coș, reduceri și trimitere email corectă) */
(function () {
  const STORAGE_KEY = 'msa_cart';
  const DISCOUNT_KEY = 'msa_discount';
  const SHIPPING = 17;

  // === EmailJS (cheile tale existente) ===
  const PUBLIC_KEY = 'SAdfb7_TV_89L_Gk';
  const SERVICE_ID = 'service_ix0zpp7';
  const TEMPLATE_ADMIN = 'template_13qpqtt';
  const TEMPLATE_CLIENT = 'template_9ytcwor';

  // === Inițializează EmailJS ===
  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch (e) { console.error(e); }
  }

  // === LocalStorage ===
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  const readDiscount = () => {
    try { return JSON.parse(localStorage.getItem(DISCOUNT_KEY) || '{"code":"","pct":0}'); }
    catch { return { code: '', pct: 0 }; }
  };
  const saveDiscount = (obj) => localStorage.setItem(DISCOUNT_KEY, JSON.stringify(obj || { code: '', pct: 0 }));

  // === Badge ===
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (i.qty || 1), 0);
    const el1 = document.getElementById('cart-count');
    const el2 = document.getElementById('cart-count-fab');
    if (el1) el1.textContent = count;
    if (el2) el2.textContent = count;
  }

  // === CRUD ===
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0) list[i].qty += 1;
    else list.push({ id, name, price: Number(price) || 0, image, qty: 1 });
    saveCart(list);
    updateCartCountBadge();
  }

  function removeFromCart(id) {
    const list = readCart().filter(p => p.id !== id);
    saveCart(list);
    updateCartCountBadge();
    renderCart();
  }

  function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    updateCartCountBadge();
    renderCart();
  }

  window.MSACart = { addToCart, readCart, clearCart };

  // === Reduceri ===
  function applyDiscount(code) {
    const validCodes = [
      { code: 'MSA10', pct: 10 },
      { code: 'MSA15', pct: 15 },
      { code: 'MSA20', pct: 20 },
    ];
    const found = validCodes.find(c => c.code.toLowerCase() === code.toLowerCase());
    if (found) {
      saveDiscount(found);
      alert(`Reducerea de ${found.pct}% a fost aplicată!`);
    } else {
      saveDiscount({ code: '', pct: 0 });
      alert('Cod invalid.');
    }
    renderCart();
  }

  // === Render coș (pentru cos.html) ===
  function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    const list = readCart();
    const discount = readDiscount();
    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML = '<p>Coșul tău este gol.</p>';
      document.getElementById('cart-total').textContent = '0 RON';
      return;
    }

    list.forEach(p => {
      const item = document.createElement('div');
      item.className = 'cart-item';
      item.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <div class="info">
          <h4>${p.name}</h4>
          <p>${p.price} RON × ${p.qty}</p>
        </div>
        <button class="remove" data-id="${p.id}">✕</button>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('.remove').forEach(b => {
      b.addEventListener('click', () => removeFromCart(b.dataset.id));
    });

    const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
    const reducere = discount.pct ? subtotal * (discount.pct / 100) : 0;
    const total = subtotal - reducere + SHIPPING;

    document.getElementById('cart-total').textContent = `${total.toFixed(2)} RON`;
    updateCartCountBadge();
  }

  // === Submit comanda ===
  async function submitOrder(form) {
    if (!form) throw new Error("Formular lipsă");

    const cart = readCart();
    if (!cart.length) { alert("Coșul este gol!"); return false; }

    const data = new FormData(form);
    const discount = readDiscount();
    const itemsHtml = cart.map(i => `${i.name} (${i.qty}×${i.price} RON)`).join('\n');
    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
    const totalFinal = total - (discount.pct ? total * discount.pct / 100 : 0) + SHIPPING;

    const templateParams = {
      client_email: data.get("email"),
      client_name: data.get("nume") + " " + data.get("prenume"),
      client_phone: data.get("telefon"),
      client_address: data.get("adresa"),
      client_city: data.get("oras"),
      client_judet: data.get("judet"),
      client_codpostal: data.get("codpostal"),
      client_tip: data.get("tip"),
      client_mentiuni: data.get("mentiuni") || "-",
      order_items: itemsHtml,
      order_total: totalFinal.toFixed(2) + " RON",
      order_discount: discount.pct ? discount.pct + "%" : "—",
    };

    // trimite la admin
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, templateParams);
    // trimite clientului
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, templateParams);

    clearCart();
    return true;
  }

  // === Handler form submit ===
  (function () {
    const form = document.getElementById("order-form");
    if (!form) return;

    let sending = false;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;
      sending = true;

      const btn = form.querySelector('button[type="submit"]');
      const oldTxt = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Se trimite..."; }

      try {
        const ok = await submitOrder(form);
        if (ok) window.location.href = "multumesc.html";
        else alert("Eroare la trimitere: nu am putut confirma comanda.");
      } catch (err) {
        console.error(err);
        alert("Eroare la trimitere: " + (err.message || "necunoscută"));
      } finally {
        sending = false;
        if (btn) { btn.disabled = false; btn.textContent = oldTxt; }
      }
    });
  })();

  // === Init coș la pornire ===
  document.addEventListener("DOMContentLoaded", () => {
    updateCartCountBadge();
    renderCart();

    const discountBtn = document.getElementById("apply-discount");
    if (discountBtn) {
      discountBtn.addEventListener("click", () => {
        const code = document.getElementById("discount-code").value.trim();
        applyDiscount(code);
      });
    }

    const clearBtn = document.getElementById("clear-cart");
    if (clearBtn) clearBtn.addEventListener("click", clearCart);
  });
})();
