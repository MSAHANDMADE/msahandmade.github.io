<script src="https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js"></script>
<script>
/* ====== CONFIG COMENZII ====== */
const SHIPPING = 17;
const FREE_FROM = 300; // livrare gratuită de la 300 chiar dacă există reducere
const DISCOUNTS = [ {t:400, p:0.20}, {t:300, p:0.15}, {t:200, p:0.10} ];
const SERVICE_ID = "service_ix0zpp7";          // din screenshot
const TEMPLATE_ADMIN = "tmpl_admin_comanda";   // pune aici ID-ul tău exact
const TEMPLATE_CLIENT = "tmpl_client_confirm"; // pune aici ID-ul tău exact
const EMAIL_PUBLIC_KEY = "ISadfb7-TV_89l_6k";  // cheia publică din screenshot

(function(){ emailjs.init(EMAIL_PUBLIC_KEY); })();

function cartItems(){ try{ return JSON.parse(localStorage.getItem("msa_cart"))||[] }catch(e){ return [] } }
function saveCart(items){ localStorage.setItem("msa_cart", JSON.stringify(items)); updateBadge(); }
function updateBadge(){
  const count = cartItems().reduce((s,i)=>s+i.qty,0);
  const el = document.getElementById("cart-count");
  if(el) el.textContent = count;
}

/* ====== RENDER COȘ ====== */
function renderCart(){
  const tb = document.getElementById("tbody");
  tb.innerHTML = "";
  const items = cartItems();
  items.forEach((it,idx)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img class="item-img" src="${it.img}" alt=""></td>
      <td>${it.nume}<div style="font-size:12px;color:#666">${it.pret.toFixed(2)} RON</div></td>
      <td>
        <div class="qty">
          <button onclick="chg(${idx},-1)">−</button>
          <input value="${it.qty}" readonly>
          <button onclick="chg(${idx},1)">+</button>
        </div>
      </td>
      <td><b>${(it.pret*it.qty).toFixed(2)} RON</b></td>
      <td><button class="btn" style="background:#b00020" onclick="rem(${idx})">Șterge</button></td>
    `;
    tb.appendChild(tr);
  });
  calcTotals();
}
function chg(i,delta){
  const items = cartItems();
  items[i].qty = Math.max(1, items[i].qty + delta);
  saveCart(items); renderCart();
}
function rem(i){
  const items = cartItems(); items.splice(i,1); saveCart(items); renderCart();
}

/* ====== TOTALURI, REDUCERI, LIVRARE ====== */
function calcTotals(){
  const items = cartItems();
  const subtotal = items.reduce((s,i)=>s+i.pret*i.qty,0);
  let reducere = 0;
  for(const d of DISCOUNTS){ if(subtotal>=d.t){ reducere = subtotal*d.p; break; } }
  const livrare = subtotal>=FREE_FROM ? 0 : SHIPPING; // GRATUIT de la 300 RON indiferent de reducere
  const total = subtotal - reducere + (items.length?livrare:0);

  document.getElementById("t-sub").textContent = subtotal.toFixed(2)+" RON";
  document.getElementById("t-disc").textContent = reducere.toFixed(2)+" RON";
  document.getElementById("t-ship").textContent = (items.length?livrare:0).toFixed(2)+" RON";
  document.getElementById("t-total").textContent = total.toFixed(2)+" RON";
}

/* ====== PF vs PJ ====== */
function bindTip(){
  const pf = document.getElementById("tip-pf");
  const pj = document.getElementById("tip-pj");
  const firm = document.getElementById("wrap-firma");
  const cui  = document.getElementById("wrap-cui");
  function apply(){
    if(pj.checked){ firm.classList.remove("hide"); cui.classList.remove("hide"); }
    else { firm.classList.add("hide"); cui.classList.add("hide"); }
  }
  pf.onchange = apply; pj.onchange = apply; apply();
}

/* ====== TRIMITERE COMANDĂ (EmailJS) ====== */
function randID(){ return Math.random().toString(36).slice(2,7).toUpperCase(); }

async function trimiteComanda(e){
  e.preventDefault();
  const items = cartItems();
  if(!items.length){ alert("Coșul este gol."); return; }

  const f = e.target;
  const data = {
    order_id: randID(),
    tip: f.tip.value==="pf"?"Persoană fizică":"Persoană juridică",
    nume: f.nume.value.trim(),
    prenume: f.prenume.value.trim(),
    email: f.email.value.trim(),
    telefon: f.telefon.value.trim(),
    judet: f.judet.value.trim(),
    oras: f.oras.value.trim(),
    codpostal: f.codpostal.value.trim(),
    adresa: f.adresa.value.trim(),
    firma: f.firma.value.trim(),
    cui: f.cui.value.trim(),
    subtotal: document.getElementById("t-sub").textContent,
    reducere: document.getElementById("t-disc").textContent,
    livrare: document.getElementById("t-ship").textContent,
    total: document.getElementById("t-total").textContent,
    produse: items.map(i=>`${i.nume} × ${i.qty} — ${(i.pret*i.qty).toFixed(2)} RON`).join("\n"),
    html_proforma: genProformaHTML(items) // pentru email client
  };

  // 1) email către tine (admin)
  await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, {
    order_id: data.order_id, tip: data.tip, nume: data.nume, prenume: data.prenume,
    email: data.email, telefon: data.telefon, judet: data.judet, oras: data.oras,
    codpostal: data.codpostal, adresa: data.adresa, produse: data.produse,
    subtotal: data.subtotal, reducere: data.reducere, livrare: data.livrare, total: data.total
  });

  // 2) email către client cu proformă
  await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, {
    to_email: data.email, order_id: data.order_id, nume: data.nume, html_proforma: data.html_proforma
  });

  // curățare + redirect
  localStorage.removeItem("msa_cart");
  window.location.href = "multumesc.html";
}

function genProformaHTML(items){
  const sub = items.reduce((s,i)=>s+i.pret*i.qty,0);
  let disc=0; for(const d of DISCOUNTS){ if(sub>=d.t){ disc=sub*d.p; break; } }
  const ship = sub>=FREE_FROM?0:SHIPPING;
  const tot = sub-disc+ship;
  const rows = items.map(i=>`
    <tr>
      <td style="padding:6px;border-bottom:1px solid #eee">${i.nume}</td>
      <td style="padding:6px;border-bottom:1px solid #eee">${i.qty}</td>
      <td style="padding:6px;border-bottom:1px solid #eee">${i.pret.toFixed(2)} RON</td>
      <td style="padding:6px;border-bottom:1px solid #eee"><b>${(i.pret*i.qty).toFixed(2)} RON</b></td>
    </tr>`).join("");
  return `
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      <thead>
        <tr><th align="left">Produs</th><th align="left">Cant.</th><th align="left">Preț</th><th align="left">Total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="3" align="right" style="padding:6px">Subtotal</td><td>${sub.toFixed(2)} RON</td></tr>
        <tr><td colspan="3" align="right" style="padding:6px">Reducere</td><td>${disc.toFixed(2)} RON</td></tr>
        <tr><td colspan="3" align="right" style="padding:6px">Livrare</td><td>${ship.toFixed(2)} RON</td></tr>
        <tr><td colspan="3" align="right" style="padding:6px;border-top:2px solid #111"><b>Total</b></td><td><b>${tot.toFixed(2)} RON</b></td></tr>
      </tfoot>
    </table>`;
}

// INIT pe cos.html
function initCartPage(){
  renderCart();
  bindTip();
  document.getElementById("checkout-form").addEventListener("submit", trimiteComanda);
}
</script>
