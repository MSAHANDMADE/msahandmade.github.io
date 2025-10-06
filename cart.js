/* MSA Handmade — cart.js (unic pentru coș + binding + reduceri) */
(function () {
  const STORAGE_KEY = 'msa_cart';
  const DISCOUNT_KEY = 'msa_discount';
  const SHIPPING = 17;

  // EmailJS keys (conform setărilor tale)
  const PUBLIC_KEY = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID = 'service_ix0zpp7';
  const TEMPLATE_ADMIN  = 'template_13qpqtt';
  const TEMPLATE_CLIENT = 'template_9ytcwor'; // confirmat

  // init EmailJS dacă există SDK-ul
  if (window.emailjs && typeof emailjs.init === 'function') {
    try { emailjs.init(PUBLIC_KEY); } catch(e){}
  }

  // === LocalStorage helpers ===
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  const readDiscount = () => {
    try { return JSON.parse(localStorage.getItem(DISCOUNT_KEY) || '{"code":"","pct":0}'); }
    catch { return {code:'', pct:0}; }
  };
  const saveDiscount = (obj) => localStorage.setItem(DISCOUNT_KEY, JSON.stringify(obj||{code:'',pct:0}));

  // === Badge ===
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (i.qty || 1), 0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CRUD by ID or index ===
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0) {
      list[i].qty = (list[i].qty || 1) + 1;
      list[i].name  = list[i].name  || name  || '';
      list[i].price = Number(list[i].price ?? price ?? 0);
      list[i].image = list[i].image || image || '';
    } else {
      list.push({ id, name: name||'', price: Number(price)||0, image: image||'', qty: 1 });
    }
    saveCart(list);
    updateCartCountBadge();
  }

  function _getByIndexOrId(indexOrId) {
    const list = readCart();
    if (typeof indexOrId === 'number') return { list, idx: indexOrId };
    const idx = list.findIndex(p => p.id === indexOrId);
    return { list, idx };
  }

  function removeFromCart(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) {
      list.splice(idx, 1);
      saveCart(list);
      updateCartCountBadge();
    }
  }

  function clearCart() { saveCart([]); updateCartCountBadge(); }

  function increaseQty(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) { list[idx].qty = (list[idx].qty || 1) + 1; saveCart(list); updateCartCountBadge(); }
  }
  function decreaseQty(indexOrId) {
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) { list[idx].qty = Math.max(1, (list[idx].qty || 1) - 1); saveCart(list); updateCartCountBadge(); }
  }
  function setQty(indexOrId, v) {
    v = parseInt(v,10); if (isNaN(v) || v < 1) v = 1;
    const { list, idx } = _getByIndexOrId(indexOrId);
    if (idx >= 0) { list[idx].qty = v; saveCart(list); updateCartCountBadge(); }
  }

  // === Reduceri ===
  function applyDiscount(code) {
    code = (code||'').trim().toUpperCase();
    let pct = 0;
    if (code === 'REDUCERE10') pct = 10;
    else if (code === 'REDUCERE15') pct = 15;
    // suport și cod numeric (ex: "12" = 12%)
    else if (/^\d{1,2}$/.test(code)) pct = Math.min(99, parseInt(code,10));

    saveDiscount({ code, pct });
    return pct;
  }

  function computeTotals(list) {
    const cart = list || readCart();
    const subtotal = cart.reduce((s,i)=> s + (Number(i.price)||0) * (i.qty||1), 0);
    const shipping = cart.length ? SHIPPING : 0;
    const disc = readDiscount();
    const reducere = subtotal * (disc.pct/100);
    const total = subtotal + shipping - reducere;
    return { subtotal, shipping, reducere, total, discount_pct: disc.pct, discount_code: disc.code };
  }

  // === Trimitere comandă (EmailJS) ===
  async function submitOrder(formData) {
    const items = readCart();
    if (!items.length) throw new Error('Coșul este gol.');
    if (!window.emailjs || typeof emailjs.send !== 'function') {
      throw new Error('EmailJS nu este inițializat (verifică scriptul din cos.html).');
    }

    const t = computeTotals(items);
    const produse = items.map(i => `${i.name} × ${i.qty} @ ${Number(i.price).toFixed(2)} RON`).join('\n');

    const data = Object.fromEntries(formData.entries());
    const order_id = `${Date.now()}-${Math.floor(Math.random()*100000)}`;

    const payload = {
      order_id,
      tip: data.tip || 'Persoană fizică',
      nume: (data.nume||'').trim(),
      prenume: (data.prenume||'').trim(),
      email: (data.email||'').trim(),
      telefon: (data.telefon||'').trim(),
      judet: (data.judet||'').trim(),
      oras: (data.oras||'').trim(),
      codpostal: (data.codpostal||'').trim(),
      adresa: (data.adresa||'').trim(),
      mentiuni: (data.mentiuni||'').trim(),
      produse,
      subtotal: t.subtotal.toFixed(2),
      livrare: t.shipping.toFixed(2),
      reducere: t.reducere.toFixed(2),
      discount_pct: t.discount_pct,
      total: t.total.toFixed(2)
    };

    // către admin
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
    // confirmare către client (dacă are email)
    if (payload.email) {
      await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, { ...payload, to_email: payload.email });
    }

    clearCart();
    return true;
  }

  // === Binding UNIC pentru butoanele "Adaugă în coș" (fără dubluri) ===
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const d = btn.dataset;
    addToCart({
      id: d.id, name: d.name, price: Number(d.price), image: d.image
    });
    const old = btn.textContent;
    btn.textContent = 'Adăugat!';
    setTimeout(()=> btn.textContent = old, 900);
  }, true);

  // === expune API global ===
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    increaseQty, decreaseQty, setQty,
    computeTotals, updateCartCountBadge,
    applyDiscount, submitOrder
  };

  // init badge pe fiecare pagină + sync între tab-uri
  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) updateCartCountBadge();
  });
})();
