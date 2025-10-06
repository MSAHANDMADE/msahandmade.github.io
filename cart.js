/* MSA Handmade — cart.js */
(function () {
  const STORAGE_KEY = 'msa_cart';
  const SHIPPING = 17;

  // EmailJS keys (din screenshot-urile tale)
  const PUBLIC_KEY = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID = 'service_ix0zpp7';
  const TEMPLATE_ADMIN = 'template_13qpqtt';
  const TEMPLATE_CLIENT = 'template_9yctwor';

  // init EmailJS dacă există SDK-ul
  if (window.emailjs && typeof emailjs.init === 'function') {
    try { emailjs.init(PUBLIC_KEY); } catch(e){}
  }

  // storage
  const readCart = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  // badge
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s, i) => s + (i.qty || 1), 0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // CRUD
  function addToCart({ id, name, price, image }) {
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    if (i > -1) list[i].qty = (list[i].qty || 1) + 1;
    else list.push({ id, name, price: Number(price) || 0, image, qty: 1 });
    saveCart(list); updateCartCountBadge();
  }
  function removeFromCart(index) { const list = readCart(); list.splice(index,1); saveCart(list); updateCartCountBadge(); }
  function clearCart() { saveCart([]); updateCartCountBadge(); }
  function increaseQty(index){ const list=readCart(); (list[index].qty = (list[index].qty||1)+1); saveCart(list); }
  function decreaseQty(index){ const list=readCart(); list[index].qty=(list[index].qty||1)-1; if(list[index].qty<1) list[index].qty=1; saveCart(list); }
  function setQty(index, v){ const list=readCart(); list[index].qty = v<1?1:v; saveCart(list); }

  function computeTotals(list){
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0) * (i.qty||1), 0);
    const shipping = list.length ? SHIPPING : 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  }

  // Submit comandă cu EmailJS
  async function submitOrder(formData){
    const items = readCart();
    if (!items.length) throw new Error('Coșul este gol.');

    if (!window.emailjs || typeof emailjs.send !== 'function') {
      throw new Error('EmailJS nu este inițializat (verifică scriptul din cos.html).');
    }

    const t = computeTotals(items);
    const produse = items.map(i => `${i.name} × ${i.qty} @ ${i.price} RON`).join('\n');

    const data = Object.fromEntries(formData.entries());
    const order_id = `${Date.now()}-${Math.floor(Math.random()*100000)}`;

    const payload = {
      order_id,
      tip: data.tip || 'Persoană fizică',
      nume: data.nume || '',
      prenume: data.prenume || '',
      email: data.email || '',
      telefon: data.telefon || '',
      judet: data.judet || '',
      oras: data.oras || '',
      codpostal: data.codpostal || '',
      adresa: data.adresa || '',
      mentiuni: data.mentiuni || '',
      produse,
      subtotal: t.subtotal.toFixed(2),
      livrare: t.shipping.toFixed(2),
      total: t.total.toFixed(2)
    };

    // către tine
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
    // către client
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, payload);

    clearCart();
    return true;
  }

  // expune API
  window.MSACart = {
    readCart, saveCart,
    addToCart, removeFromCart, clearCart,
    increaseQty, decreaseQty, setQty,
    computeTotals, updateCartCountBadge,
    submitOrder
  };

  // init badge pe fiecare pagină
  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
