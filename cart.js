/* =======================
   MSA Handmade — cart.js
   ======================= */
(function () {
  const STORAGE_KEY = "msa_cart";
  const SHIPPING = 17;

  // EmailJS config
  const PUBLIC_KEY = "iSadfb7-TV_89l_6k";
  const SERVICE_ID = "service_ix0zpp7";
  const TEMPLATE_ADMIN  = "template_13qpqtt"; // către tine
  const TEMPLATE_CLIENT = "template_9yctwor"; // către client

  if (window.emailjs && typeof emailjs.init === "function") {
    try { emailjs.init(PUBLIC_KEY); } catch(_) {}
  }

  // storage
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  };
  const saveCart = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  // badge
  function updateCartCountBadge(){
    const count = readCart().reduce((s,i)=>s+(+i.qty||0),0);
    const b1 = document.getElementById("cart-count");
    const b2 = document.getElementById("cart-count-fab");
    if (b1) b1.textContent = count;
    if (b2) b2.textContent = count;
  }

  // CRUD
  function addToCart({id,name,price,image}){
    const cart = readCart();
    const i = cart.findIndex(p=>p.id===id);
    if (i>-1) cart[i].qty = (+cart[i].qty||0)+1;
    else cart.push({id,name,price:+price,image,qty:1});
    saveCart(cart); updateCartCountBadge();
    document.dispatchEvent(new CustomEvent("msa:added",{detail:{id,name}}));
  }
  function removeFromCart(id){ saveCart(readCart().filter(p=>p.id!==id)); updateCartCountBadge(); }
  function clearCart(){ saveCart([]); updateCartCountBadge(); }
  function increaseQty(id){ const c=readCart(); const it=c.find(p=>p.id===id); if(it){it.qty=(+it.qty||0)+1; saveCart(c); updateCartCountBadge();}}
  function decreaseQty(id){ const c=readCart(); const it=c.find(p=>p.id===id); if(it){ it.qty=(+it.qty||0)-1; if(it.qty<=0) saveCart(c.filter(p=>p.id!==id)); else saveCart(c); updateCartCountBadge();}}
  function setQty(id,v){ let q=parseInt(v,10); if(isNaN(q)||q<0) q=0; const c=readCart(); const it=c.find(p=>p.id===id); if(it){ it.qty=q; if(q===0) saveCart(c.filter(p=>p.id!==id)); else saveCart(c); updateCartCountBadge(); } }
  function computeTotals(list){ const subtotal=list.reduce((s,i)=>s+i.price*(+i.qty||0),0); const shipping=list.length?SHIPPING:0; return {subtotal,shipping,total:subtotal+shipping}; }

  // Submit comandă via EmailJS
  async function submitOrder(formData){
    const items = readCart();
    if (!items.length) throw new Error("Empty cart");
    if (!window.emailjs) throw new Error("EmailJS missing");

    const data = Object.fromEntries(formData.entries());
    const produse = items.map(i=>`- ${i.name} x ${i.qty} = ${i.price*i.qty} RON`).join("\n");
    const t = computeTotals(items);
    const order_id = `${Date.now()}-${Math.floor(Math.random()*10000)}`;

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
      produse,
      subtotal: t.subtotal,
      livrare: t.shipping,
      total: t.total
    };

    // trimite la tine:
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, payload);
    // trimite clientului:
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, payload);

    clearCart(); // golește după succes
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

  // init badge
  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
