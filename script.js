// === anul în footer
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

// === meniu mobil (hamburger DOAR pe mobil)
const btn = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
btn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(open));
});

// === contor coș vizibil (funcționează și fără cart.js încărcat)
(function ensureCartBadge(){
  try {
    const raw = localStorage.getItem("msa_cart");
    const cart = raw ? JSON.parse(raw) : [];
    const count = cart.reduce((s, it) => s + (it.qty || 0), 0);
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = String(count);
  } catch {}
})();

// === LIGHTBOX pentru toate imaginile din site
(function setupLightbox(){
  // creăm overlay-ul o singură dată
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `
    <button class="close" aria-label="Închide">✕</button>
    <img alt="previzualizare imagine">
  `;
  document.body.appendChild(lb);
  const imgTag = lb.querySelector("img");
  const closeBtn = lb.querySelector(".close");

  function open(src, alt){
    imgTag.src = src;
    imgTag.alt = alt || "imagine";
    lb.classList.add("open");
  }
  function close(){ lb.classList.remove("open"); imgTag.src = ""; }

  // închide pe fundal sau pe buton
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });

  // ascultă click pe orice imagine din carduri / pagini produs
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".card img, .product img");
    if (!img) return;
    e.preventDefault();
    open(img.src, img.alt);
  });
})();
