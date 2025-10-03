/***********************
 *  Utilitare mici     *
 ***********************/
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

/***********************
 *  Header & Footer     *
 ***********************/
const y = $("#year");
if (y) y.textContent = new Date().getFullYear();

// meniu mobil (hamburger – CSS îl ascunde pe desktop)
const btn = $(".menu-toggle");
const nav = $(".nav");
btn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(open));
});

/*********************************
 *  Badge coș (din localStorage) *
 *********************************/
(function ensureCartBadge(){
  try {
    const raw = localStorage.getItem("msa_cart");
    const cart = raw ? JSON.parse(raw) : [];
    const count = cart.reduce((s, it) => s + (it.qty || 0), 0);
    ["cart-count","cart-count-fab"].forEach(id=>{
      const el = document.getElementById(id);
      if (el) el.textContent = String(count);
    });
  } catch {}
})();

/***********************
 *  Lightbox pentru poze
 ***********************/
(function setupLightbox(){
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `
    <button class="close" aria-label="Închide">✕</button>
    <img alt="previzualizare imagine">
  `;
  document.body.appendChild(lb);
  const imgTag = lb.querySelector("img");
  const closeBtn = lb.querySelector(".close");

  function open(src, alt){ imgTag.src = src; imgTag.alt = alt || "imagine"; lb.classList.add("open"); }
  function close(){ lb.classList.remove("open"); imgTag.src = ""; }

  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });

  document.addEventListener("click", (e) => {
    const img = e.target.closest(".card img, .product img");
    if (!img) return;
    e.preventDefault(); open(img.src, img.alt);
  });
})();

/***********************
 *  EmailJS – setări   *
 ***********************/
const EMAILJS_PUBLIC_KEY = "iSadfb7-TV_89l_6k";      // cheia PUBLICĂ
const EMAILJS_SERVICE_ID = "service_ix0zpp7";        // service-ul tău
const EMAILJS_TEMPLATE_ADMIN  = "template_13qpqtt";  // primești tu
const EMAILJS_TEMPLATE_CLIENT = "template_9yctwor";  // clientul

(function initEmailJS(){
  if (typeof emailjs !== "undefined") {
    try { emailjs.init(EMAILJS_PUBLIC_KEY); }
    catch(e){ console.warn("EmailJS init error:", e); }
  }
})();

/********************************************
 *  Trimiterea comenzii (dacă există formular)
 ********************************************/
(function orderFormHandler(){
  const form = $("#order-form");
  if (!form || typeof emailjs === "undefined") return;

  function genOrderId(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const api = window.MSACart;              // din cart.js
    const status = $("#order-status");

    try {
      const cart = api?.readCart ? api.readCart() : [];
      if (!cart.length) { status.className="status err"; status.textContent="Coșul este gol."; return; }

      const fd = new FormData(form);
      const produse = cart.map(it => `• ${it.name} × ${it.qty} — ${it.price} RON`).join("\n");
      const totals  = api?.computeTotals ? api.computeTotals(cart) : { subtotal:0, shipping:17, total:17 };
      const order_id = genOrderId();

      const payload = {
        tip: fd.get("tip"),
        nume: fd.get("nume"),
        prenume: fd.get("prenume"),
        email: fd.get("email"),
        telefon: fd.get("telefon"),
        judet: fd.get("judet"),
        oras: fd.get("oras"),
        codpostal: fd.get("codpostal"),
        adresa: fd.get("adresa"),
        mentiuni: fd.get("mentiuni") || "",
        produse, subtotal: totals.subtotal, livrare: totals.shipping, total: totals.total,
        order_id
      };

      status.className = "status";
      status.textContent = "Trimit comanda…";

      // 1) către tine
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN, payload);
      // 2) către client
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENT, payload);

      status.classList.add("ok");
      status.textContent = "Comanda a fost trimisă cu succes.";
      api?.clearCart?.();
      setTimeout(()=>{ location.href = "multumesc.html"; }, 600);

    } catch (err) {
      console.error("EmailJS error:", err);
      const msg = (err && (err.text || err.message)) ? String(err.text || err.message) : "Eroare necunoscută.";
      status.className = "status err";
      status.textContent = "Eroare la trimitere: " + msg;
    }
  });

  // Golește coșul (dacă e buton în pagină)
  $("#clear-cart")?.addEventListener("click", () => {
    try { window.MSACart?.clearCart(); } catch {}
    window.MSACart?.updateCartCountBadge?.();
    const list = $("#cart-list"); if (list) list.innerHTML = "";
    const empty = $("#cart-empty"); if (empty) empty.style.display = "block";
    const totals = $("#totals"); if (totals) totals.style.display = "none";
    const formBox = $("#order-form"); if (formBox) formBox.style.display = "none";
  });
})();

/************************************************
 *  Toast „Adăugat în coș” (dacă există .toast) *
 ************************************************/
(function setupToast(){
  const toast = $("#toast");
  if (!toast) return;
  function showToast(msg){
    toast.textContent = msg || "Adăugat în coș";
    toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"), 1200);
  }
  document.addEventListener("msa:added", (e)=>{
    const name = e.detail?.name || "Produs";
    showToast(`${name} — adăugat în coș`);
  });
})();
