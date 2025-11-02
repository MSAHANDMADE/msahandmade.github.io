<script>
// ==== CONFIG IMAGINI & PRODUSE (folosește exact numele din /images) ====
window.PRODUSE = [
  {
    id: "coronita-rosu-auriu",
    nume: "Coroniță Crăciun – roșu & auriu",
    pret: 35,
    img: "images/coronita1.png",
    descr: "Strălucire caldă de sărbătoare: flori aurii și accente roșii."
  },
  {
    id: "coronita-alb-argintiu",
    nume: "Coroniță Crăciun – alb & argintiu",
    pret: 35,
    img: "images/coronita2.png",
    descr: "Eleganță rece de iarnă: alb sidefat și panglici argintii."
  }
  // Poți adăuga rapid alte produse păstrând schema de mai sus,
  // dar te rog să NU schimbi denumirile fișierelor din /images.
];

// ==== CART STORAGE ====
const CART_KEY = "msa_cart";
function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY))||[] }catch(e){ return [] }}
function setCart(x){ localStorage.setItem(CART_KEY, JSON.stringify(x)); updateBadge() }
function updateBadge(){
  const c = getCart().reduce((s,i)=>s+i.qty,0);
  const el = document.getElementById("cart-count");
  if(el) el.textContent = c;
}
updateBadge();

// ==== POP-UP IMAGINE PRODUS ====
function openModal(p){
  const m = document.getElementById("prod-modal");
  m.querySelector(".m-title").textContent = p.nume;
  m.querySelector(".m-desc").textContent  = p.descr;
  m.querySelector(".m-price").textContent = p.pret.toFixed(2)+" RON";
  m.querySelector("img").src = p.img;
  m.querySelector(".m-add").onclick = ()=>{ addToCart(p.id,1); m.classList.remove("show"); };
  m.classList.add("show");
}
function closeModal(){ document.getElementById("prod-modal").classList.remove("show"); }

// ==== ADAUGĂ ÎN COȘ ====
function addToCart(id, q=1){
  const cart = getCart();
  const p = PRODUSE.find(x=>x.id===id); if(!p) return;
  const idx = cart.findIndex(x=>x.id===id);
  if(idx>=0){ cart[idx].qty += q; } else { cart.push({id, qty:q, nume:p.nume, pret:p.pret, img:p.img}); }
  setCart(cart);
}

// ==== RENDER PRODUSE (folosit în produse.html) ====
function renderProduse(containerId){
  const root = document.getElementById(containerId);
  root.innerHTML = "";
  PRODUSE.forEach(p=>{
    const card = document.createElement("div");
    card.className="card";
    card.innerHTML = `
      <img class="card-img" alt="${p.nume}" src="${p.img}" onclick='openModal(${JSON.stringify(p)})'>
      <div class="card-body">
        <div class="card-title">${p.nume}</div>
        <div class="card-desc">${p.descr}</div>
        <div class="card-price">${p.pret.toFixed(2)} RON</div>
        <button class="btn" onclick="addToCart('${p.id}',1)">Adaugă în coș</button>
      </div>`;
    root.appendChild(card);
  });
}
</script>
