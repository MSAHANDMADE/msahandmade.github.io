<!-- pune-l ca /cart.js în rădăcina repo-ului -->
<script>
// MSA Handmade — coș + reduceri automate + livrare + EmailJS
(function () {
  // === CONFIG ===
  const STORAGE_KEY   = 'msa_cart';
  const LAST_ORDER    = 'msa_last_order';
  const SHIPPING_BASE = 17;

  // Reduceri automate (în funcție de SUBTOTAL, fără livrare)
  function computeTotals(list) {
    const subtotal = list.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
    let pct = 0, shipping = SHIPPING_BASE;

    if (subtotal >= 400) { pct = 20; }
    else if (subtotal >= 300) { pct = 15; shipping = 0; }
    else if (subtotal >= 200) { pct = 10; }

    const discount = +(subtotal * pct / 100);
    const total    = +(subtotal - discount + shipping);
    return { subtotal, discount, shipping, total, pct };
  }

  // === STORAGE ===
  function readCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveCart(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list||[]));
  }
  function setLastOrder(payload){
    try { localStorage.setItem(LAST_ORDER, JSON.stringify(payload)); } catch {}
  }

  // === BADGE ===
  function updateCartCountBadge() {
    const list = readCart();
    const count = list.reduce((s,i)=> s + (parseInt(i.qty)||1), 0);
    const b1 = document.getElementById('cart-count');
    const b2 = document.getElementById('cart-count-fab');
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // === CRUD ===
  function addToCart({ id, name, price, image }) {
    if (!id) return;
    const list = readCart();
    const i = list.findIndex(p => p.id === id);
    price = Number(price)||0;
    if (i>-1) list[i].qty = (parseInt(list[i].qty)||1) + 1;
    else list.push({ id, name: name||'', price, image:image||'', qty: 1 });
    saveCart(list); updateCartCountBadge();
  }
  function removeFromCart(indexOrId) {
    const list = readCart();
    const idx  = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1) { list.splice(idx,1); saveCart(list); updateCartCountBadge(); }
  }
  function clearCart() { saveCart([]); updateCartCountBadge(); }
  function setQty(indexOrId, v){
    const list = readCart();
    const idx  = (typeof indexOrId==='number') ? indexOrId : list.findIndex(p=>p.id===indexOrId);
    if (idx>-1) {
      const q = Math.max(1, Number(v)||1);
      list[idx].qty = q;
      saveCart(list); updateCartCountBadge();
    }
  }

  // === EMAILJS ===
  // Cheile tale (cele pe care le-ai confirmat)
  const PUBLIC_KEY     = 'iSadfb7-TV_89l_6k';
  const SERVICE_ID     = 'service_ix0zpp7';
  const TEMPLATE_ADMIN = 'template_13qpqtt';  // către tine
  const TEMPLATE_CLIENT= 'template_9yctwor';   // către client

  // Pornește SDK (dar doar dacă îl ai inclus în cos.html)
  function emailOk() {
    return (window.emailjs && typeof emailjs.init === 'function');
  }
  function emailInit() {
    try { emailjs.init(PUBLIC_KEY); } catch {}
  }

  /**
   * Submit comanda (primește form elementul din cos.html)
   * Trimite două mailuri: către tine (admin) și către client (confirmare).
   */
  async function submitOrder(formEl) {
    if (!formEl) throw new Error('Form invalid');

    const list = readCart();
    if (!list.length) throw new Error('Coșul este gol.');

    // culegem datele din formular
    const fd = new FormData(formEl);
    const data = Object.fromEntries(fd.entries());
    // normalizări
    data.tip       = data.tip || 'Persoană fizică';
    data.nume      = (data.nume||'').trim();
    data.prenume   = (data.prenume||'').trim();
    data.email     = (data.email||'').trim();
    data.telefon   = (data.telefon||'').trim();
    data.judet     = (data.judet||'').trim();
    data.oras      = (data.oras||'').trim();
    data.codpostal = (data.codpostal||'').trim();
    data.adresa    = (data.adresa||'').trim();
    data.mentiuni  = (data.mentiuni||'').trim();
    // PJ extra
    data.cui       = (data.cui||'').trim();
    data.regcom    = (data.regcom||'').trim();
    data.denumire  = (data.denumire||'').trim();

    // atașăm produsele + totalurile
    const totals = computeTotals(list);
    data.items = list;

    // păstrăm o copie local (pentru proforma.html)
    setLastOrder({
      id: Date.now().toString(36).slice(-5).toUpperCase(),
      ts: Date.now(),
      tip: data.tip,
      nume: data.nume,
      prenume: data.prenume,
      email: data.email,
      telefon: data.telefon,
      judet: data.judet,
      oras: data.oras,
      codpostal: data.codpostal,
      adresa: data.adresa,
      mentiuni: data.mentiuni,
      cui: data.cui, regcom: data.regcom, denumire: data.denumire,
      items: list,
      subtotal: +totals.subtotal.toFixed(2),
      discount: +totals.discount.toFixed(2),
      shipping: +totals.shipping.toFixed(2),
      total: +totals.total.toFixed(2),
      pct: totals.pct
    });

    // pregătim variabilele pentru EmailJS (trebuie să se potrivească cu {{...}} din template)
    const produseText = list.map(i => `• ${i.name} × ${i.qty} = ${(i.price*i.qty).toFixed(2)} RON`).join('\n');

    const adminVars = {
      site: 'msahandmade.ro',
      tip: data.tip,
      nume: data.nume + (data.prenume ? ' ' + data.prenume : ''),
      email: data.email,
      telefon: data.telefon,
      judet: data.judet,
      oras: data.oras,
      codpostal: data.codpostal,
      adresa: data.adresa,
      cui: data.cui,
      regcom: data.regcom,
      denumire: data.denumire,
      produse: produseText,
      subtotal: totals.subtotal.toFixed(2),
      shipping: totals.shipping.toFixed(2),
      total: totals.total.toFixed(2),
      mentiuni: data.mentiuni || '-'
    };

    const clientVars = {
      nume: data.nume || 'client',
      total: totals.total.toFixed(2),
      site: 'msahandmade.ro'
    };

    // trimitem mailurile
    if (emailOk()) emailInit();
    if (!emailOk()) throw new Error('EmailJS indisponibil');

    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, adminVars);
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, clientVars);

    // după success: golim coșul + redirect
    clearCart();
    window.location.href = 'multumesc.html';
  }

  // expunem API global (folosit în produse.html & cos.html)
  window.MSACart = {
    readCart, saveCart, computeTotals,
    addToCart, removeFromCart, clearCart, setQty,
    submitOrder, updateCartCountBadge
  };

  // actualizează badge la încărcare
  document.addEventListener('DOMContentLoaded', updateCartCountBadge);
})();
</script>
