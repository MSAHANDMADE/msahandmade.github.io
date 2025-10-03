/* =======================
   MSA Handmade — cart.js
   ======================= */

(function () {
  const STORAGE_KEY = "msa_cart";
  const SHIPPING = 17;

  // --- EmailJS (completează cu datele tale — sunt deja setate) ---
  const EMAILJS_PUBLIC_KEY = "iSadfb7-TV_89l_6k";
  const EMAILJS_SERVICE_ID = "service_ix0zpp7";
  const EMAILJS_TEMPLATE_ADMIN = "template_13qpqtt";   // "Comandă nouă" (către tine)
  const EMAILJS_TEMPLATE_CLIENT = "template_9yctwor";  // "Order Confirmation" (către client)

  // Inițializează EmailJS dacă există scriptul încărcat
  if (window.emailjs && typeof window.emailjs.init === "function") {
    try { window.emailjs.init(EMAILJS_PUBLIC_KEY); } catch (_) {}
  }

  // --- Helpers LocalStorage ---
  function readCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // --- Badge count (header + buton flotant) ---
  function updateCartCountBadge() {
    const cart = readCart();
    const count = cart.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // --- CRUD coș ---
  function addToCart(item) {
    const cart = readCart();
    const idx = cart.findIndex(p => p.id === item.id);
    if (idx >= 0) {
      cart[idx].qty = Number(cart[idx].qty || 0) + 1;
    } else {
      cart.push({ id: item.id, name: item.name, price: Number(item.price), image: item.image, qty: 1 });
    }
    saveCart(cart);
    updateCartCountBadge();

    // eveniment pentru mesaje/animatii
    const ev = new CustomEvent("msa:added", { detail: item });
    document.dispatchEvent(ev);
  }

  function removeFromCart(id) {
    const cart = readCart().filter(p => p.id !== id);
    saveCart(cart);
    updateCartCountBadge();
  }
  function clearCart() {
    saveCart([]);
    updateCartCountBadge();
  }
  function increaseQty(id) {
    const cart = readCart();
    const it = cart.find(p => p.id === id);
    if (it) it.qty = Number(it.qty || 0) + 1;
    saveCart(cart);
    updateCartCountBadge();
  }
  function decreaseQty(id) {
    const cart = readCart();
    const it = cart.find(p => p.id === id);
    if (it) {
      it.qty = Number(it.qty || 0) - 1;
      if (it.qty <= 0) {
        const filtered = cart.filter(p => p.id !== id);
        saveCart(filtered);
      } else {
        saveCart(cart);
      }
      updateCartCountBadge();
    }
  }
  function setQty(id, value) {
    let q = parseInt(value, 10);
    if (isNaN(q) || q < 0) q = 0;
    const cart = readCart();
    const it = cart.find(p => p.id === id);
    if (it) {
      it.qty = q;
      if (q === 0) {
        saveCart(cart.filter(p => p.id !== id));
      } else {
        saveCart(cart);
      }
      updateCartCountBadge();
    }
  }

  function computeTotals(list) {
    const subtotal = list.reduce((s, it) => s + Number(it.price) * Number(it.qty || 0), 0);
    const shipping = list.length ? SHIPPING : 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  }

  // --- Randare automată pentru cos.html (IDs simple) ---
  function renderCartSimple() {
    const wrap = document.getElementById("cart-items");
    if (!wrap) return; // suntem pe altă pagină

    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");
    const clearBtn = document.getElementById("clear-cart");
    const form = document.getElementById("checkout-form");
    const msg = document.getElementById("message");

    const cart = readCart();
    wrap.innerHTML = "";

    if (!cart.length) {
      wrap.innerHTML = `<p style="color:#6b7280">Coșul este gol.</p>`;
      if (subtotalEl) subtotalEl.textContent = "0";
      if (totalEl) totalEl.textContent = "0";
      if (form) form.style.display = "none";
      return;
    } else {
      if (form) form.style.display = "block";
    }

    cart.forEach(it => {
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:64px 1fr auto auto;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #eee";

      const img = document.createElement("img");
      img.src = it.image;
      img.alt = it.name;
      Object.assign(img.style, { width:"64px", height:"48px", objectFit:"cover", borderRadius:"8px" });

      const info = document.createElement("div");
      info.innerHTML = `<div style="font-weight:600">${it.name}</div>
        <div style="display:inline-flex;gap:6px;margin-top:6px;align-items:center">
          <button type="button" class="qty-btn" data-act="minus" data-id="${it.id}">–</button>
          <input class="qty-input" type="number" min="0" step="1" value="${it.qty}" data-id="${it.id}">
          <button type="button" class="qty-btn" data-act="plus" data-id="${it.id}">+</button>
        </div>`;

      const price = document.createElement("div");
      price.textContent = `${it.price} RON`;

      const del = document.createElement("button");
      del.textContent = "Șterge";
      del.className = "btn-danger";
      del.onclick = () => { removeFromCart(it.id); renderCartSimple(); };

      row.append(img, info, price, del);
      wrap.appendChild(row);
    });

    const { subtotal, shipping, total } = computeTotals(cart);
    if (subtotalEl) subtotalEl.textContent = String(subtotal);
    if (totalEl) totalEl.textContent = String(total);

    if (clearBtn) {
      clearBtn.onclick = () => { clearCart(); renderCartSimple(); };
    }

    // Submit comandă
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const items = readCart();
        if (!items.length) {
          if (msg) { msg.textContent = "Coșul este gol."; msg.style.color = "#b91c1c"; }
          return;
        }

        // colectăm datele
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());

        // produsele sub formă de listă text
        const produseText = items.map(it => `- ${it.name} x ${it.qty} = ${it.price * it.qty} RON`).join("\n");

        const t = computeTotals(items);
        const order_id = (Date.now() + "-" + Math.floor(Math.random()*10000));

        const payload = {
          order_id,
          tip: data.tip || "Persoană fizică",
          nume: data.nume || "",
          prenume: data.prenume || "",
          email: data.email || "",
          telefon: data.telefon || "",
          judet: data.judet || "",
          oras: data.oras || "",
          codpostal: data.codpostal || "",
          adresa: data.adresa || "",
          mentiuni: data.mentiuni || "",
          produse: produseText,
          subtotal: t.subtotal,
          livrare: t.shipping,
          total: t.total
        };

        if (!window.emailjs) {
          if (msg) { msg.textContent = "Eroare: EmailJS nu este disponibil."; msg.style.color = "#b91c1c"; }
          return;
        }

        // Trimitere către tine (admin)
        try {
          if (msg) { msg.textContent = "Se trimite comanda…"; msg.style.color = "#6b7280"; }
          await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN, payload);
          // Trimitere către client (confirmare)
          await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, payload);

          if (msg) { msg.textContent = "Comanda a fost trimisă cu succes!"; msg.style.color = "#065f46"; }
          clearCart();
          // Redirect opțional către pagina de mulțumire, dacă există
          setTimeout(() => {
            try { location.href = "multumesc.html"; }
            catch (_) {}
          }, 800);
        } catch (err) {
          if (msg) { msg.textContent = "Eroare la trimitere. Te rugăm încearcă din nou."; msg.style.color = "#b91c1c"; }
          console.error("EmailJS error:", err);
        }
      };
    }
  }

  // expunem o mică API globală (folosită și pe Produse)
  window.MSACart = {
    addToCart,
    readCart,
    saveCart,
    removeFromCart,
    clearCart,
    increaseQty,
    decreaseQty,
    setQty,
    computeTotals,
    updateCartCountBadge,
  };

  // ascultăm clickurile de +/– din cos.html (delegare)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".qty-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");
    if (!id) return;
    if (act === "minus") decreaseQty(id);
    if (act === "plus") increaseQty(id);
    renderCartSimple();
  });
  // schimbare directă în input nr.
  document.addEventListener("change", (e) => {
    const inp = e.target.closest(".qty-input");
    if (!inp) return;
    const id = inp.getAttribute("data-id");
    setQty(id, inp.value);
    renderCartSimple();
  });

  // init la încărcarea paginii
  document.addEventListener("DOMContentLoaded", () => {
    updateCartCountBadge();
    renderCartSimple();
  });
})();
