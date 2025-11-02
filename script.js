/* ====== CART (comun cu cos.html) ====== */
const CART_KEY = "msa_cart";
function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || [] }catch(e){ return [] } }
function setCart(v){ localStorage.setItem(CART_KEY, JSON.stringify(v)); updateBadge(); }
function updateBadge(){
  const count = getCart().reduce((s,i)=>s + (i.qty||0), 0);
  const el = document.getElementById("cart-count");
  if (el) el.textContent = count;
}
function addToCart(p, qty=1){
  const cart = getCart();
  const i = cart.findIndex(x => x.id === p.id);
  if (i >= 0) cart[i].qty += qty;
  else cart.push({ id:p.id, nume:p.nume, pret:p.pret, img:p.img, qty:qty });
  setCart(cart);
}

/* ====== PRODUSE ======
   Toate imaginile sunt în /images/ exact cum există în repo.
   Ajustează descriere/pret/dim/dacă e cazul. Am pus texte decente (nepromoționale).
*/
const PRODUSE = [
  // Coronițe (35 RON)
  { id:"coronita-rosu-auriu",   nume:"Coroniță Crăciun – roșu & auriu",
    pret:35, img:"images/coronita1.png",
    descr:"Strălucire caldă de sărbătoare: flori aurii și accente roșii.",
    dim:"Ø ~35 cm", greutate:"~350 g"
  },
  { id:"coronita-alb-argintiu", nume:"Coroniță Crăciun – alb & argintiu",
    pret:35, img:"images/coronita2.png",
    descr:"Eleganță rece de iarnă: alb sidefat și panglici argintii.",
    dim:"Ø ~35 cm", greutate:"~350 g"
  },

  // Set/aranjamente & imagini suplimentare (denumiri din fișierele tale)
  { id:"buchet", nume:"Buchet (aranjament decor)", pret:45,
    img:"images/buchet.jpg",
    descr:"Aranjament decorativ – potrivit pentru masă sau cadou.",
    dim:"~20×12 cm", greutate:"~300 g"
  },
  { id:"crin", nume:"Crin – lumânare decor", pret:45,
    img:"images/crin.jpg",
    descr:"Lumânare din ceară în formă de crin, pe suport de ipsos.",
    dim:"~9×9 cm", greutate:"~250 g"
  },
  { id:"dans", nume:"Dans – figurină decor", pret:45,
    img:"images/dans.jpg",
    descr:"Figurină tematică turnată, finisată manual.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"family", nume:"Family – figurină decor", pret:45,
    img:"images/family.png",
    descr:"Compoziție familială, ideală pentru cadou.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"flori", nume:"Flori – lumânare decor", pret:45,
    img:"images/flori.jpg",
    descr:"Lumânare din ceară cu motiv floral, suport ipsos.",
    dim:"~10×10 cm", greutate:"~260 g"
  },
  { id:"floricele", nume:"Floricele – lumânare decor", pret:45,
    img:"images/floricele.png",
    descr:"Mix floral diafan; turnată manual cu grijă.",
    dim:"~10×10 cm", greutate:"~250 g"
  },
  { id:"indragostitii", nume:"Îndrăgostiții – figurină decor", pret:45,
    img:"images/indragostitii.jpg",
    descr:"Duo romantic, detaliu fin, ideal pentru ocazii speciale.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"inger", nume:"Înger – figurină decor", pret:30,
    img:"images/inger.jpg",
    descr:"Figurină din ceară pe suport de ipsos.",
    dim:"~10×6 cm", greutate:"~180 g"
  },
  { id:"ingeras", nume:"Îngeraș – figurină decor", pret:28,
    img:"images/ingeras.png",
    descr:"Mini figurină angelică, perfectă pentru un colț de poveste.",
    dim:"~9×5 cm", greutate:"~150 g"
  },
  { id:"isus", nume:"Iisus – relief decorativ", pret:45,
    img:"images/isus.png",
    descr:"Relief decorativ turnat, finisaj atent.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"logodna", nume:"Logodnă – figurină decor", pret:45,
    img:"images/logodna.jpg",
    descr:"Compoziție elegantă pentru ocazii speciale.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"lumanare-floarea-soarelui", nume:"Lumânare Floarea-soarelui", pret:45,
    img:"images/lumanare_floarea-soarelui.png",
    descr:"Lumânare din ceară parfumată, pe suport de ipsos.",
    dim:"~8×8×5 cm", greutate:"~250 g"
  },
  { id:"peisaj", nume:"Peisaj – relief decorativ", pret:45,
    img:"images/peisaj.jpg",
    descr:"Relief decorativ cu peisaj, turnat în ipsos.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"peisajiarna", nume:"Peisaj iarnă – relief decorativ", pret:45,
    img:"images/peisajiarna.jpg",
    descr:"Scenă de iarnă, textură bogată, finisaj manual.",
    dim:"~12×8 cm", greutate:"~300 g"
  },
  { id:"sarut", nume:"Sărut – relief decorativ", pret:45,
    img:"images/sarut.jpg",
    descr:"Compoziție decorativă, inspirată, cu efect elegant.",
    dim:"~12×8 cm", greutate:"~300 g"
  }
];

/* ====== RENDER ====== */
function productCard(p, idx){
  return `
  <div class="card">
    <img class="card-img" src="${p.img}" alt="${p.nume}" data-idx="${idx}">
    <div class="card-body">
      <div class="card-title">${p.nume}</div>
      <div class="card-desc">${p.descr||""}</div>
      <div class="muted">${[p.dim, p.greutate].filter(Boolean).join(" • ")}</div>
      <div class="card-price">${p.pret.toFixed(2)} RON</div>
      <button class="btn" onclick="addToCart(PRODUSE[${idx}],1)">Adaugă în coș</button>
    </div>
  </div>`;
}

function renderProduse(){
  const grid = document.getElementById("prod-grid");
  grid.innerHTML = PRODUSE.map((p,i)=>productCard(p,i)).join("");

  // click pe imagine => modal
  grid.querySelectorAll(".card-img").forEach(img=>{
    img.addEventListener("click", () => {
      const p = PRODUSE[img.dataset.idx];
      document.getElementById("m-title").textContent = p.nume;
      document.getElementById("m-img").src = p.img;
      document.getElementById("m-desc").textContent = p.descr || "";
      document.getElementById("m-specs").textContent = [p.dim, p.greutate].filter(Boolean).join(" • ");
      document.getElementById("m-price").textContent = p.pret.toFixed(2) + " RON";
      const btn = document.getElementById("m-add");
      btn.onclick = () => { addToCart(p,1); closeModal(); };
      document.getElementById("prod-modal").classList.add("show");
    });
  });
}

function closeModal(){ document.getElementById("prod-modal").classList.remove("show"); }

/* init */
updateBadge();
renderProduse();
