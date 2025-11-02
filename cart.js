/* ===========================
   Coș + Checkout + EmailJS
   =========================== */

const SERVICE_ID = "service_ix0zpp7";
const TEMPLATE_CLIENT = "template_9yctwor";   // Order Confirmation
const TEMPLATE_ADMIN  = "template_13qpqtt";   // Contact Us / Admin
const CART_KEY = "msa_cart";

function loadCart(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch(e){ return []; }
}
function saveCart(list){
  localStorage.setItem(CART_KEY, JSON.stringify(list));
  // actualizează badge
  const count = list.reduce((s,i)=>s+(i.qty||1),0);
  const el = document.getElementById("cart-count");
  if(el) el.textContent = count;
}

function money(v){ return `${v.toFixed(2)} RON`; }

function calcTotals(list){
  const subtotal = list.reduce((s,i)=> s + i.price * i.qty, 0);
  // reduceri pe praguri
  let discRate = 0;
  if (subtotal >= 400) discRate = 0.20;
  else if (subtotal >= 300) discRate = 0.15;
  else if (subtotal >= 200) discRate = 0.10;
  const discount = +(subtotal * discRate);
  const afterDisc = subtotal - discount;

  // livrare 0 de la 300 RON chiar dacă există reducere -> criteriu pe subtotal
  const shipping = subtotal >= 300 ? 0 : 17;

  const total = afterDisc + shipping;
  return { subtotal, discount, afterDisc, shipping, total };
}

function renderCart(){
  const body = document.getElementById("cart-body");
  const list = loadCart();

  body.innerHTML = "";
  list.forEach((item, idx)=>{
    const tr = document.createElement("tr");

    const tdProd = document.createElement("td");
    tdProd.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        <img src="${item.img}" alt="${item.title}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #eee">
        <div><b>${item.title}</b></div>
      </div>
    `;

    const tdPrice = document.createElement("td");
    tdPrice.textContent = money(item.price);

    const tdQty = document.createElement("td");
    tdQty.innerHTML = `
      <div class="qty">
        <button aria-label="Scade" data-act="dec" data-i="${idx}">−</button>
        <input type="number" min="1" value="${item.qty}" data-i="${idx}">
        <button aria-label="Crește" data-act="inc" data-i="${idx}">+</button>
      </div>
    `;

    const tdTotal = document.createElement("td");
    tdTotal.className = "col-total";
    tdTotal.textContent = money(item.price * item.qty);

    tr.append(tdProd, tdPrice, tdQty, tdTotal);
    body.appendChild(tr);
  });

  // listeners pentru qty
  body.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-act]");
    if(!btn) return;
    const i = +btn.dataset.i;
    const act = btn.dataset.act;
    const list = loadCart();
    if(!list[i]) return;
    if(act === "inc") list[i].qty += 1;
    if(act === "dec") list[i].qty = Math.max(1, list[i].qty - 1);
    saveCart(list);
    renderCart();
    updateTotals();
  });
  body.addEventListener("change", (e)=>{
    if(e.target.matches('.qty input')){
      const i = +e.target.dataset.i;
      const list = loadCart();
      const v = Math.max(1, parseInt(e.target.value||"1",10));
      if(list[i]) list[i].qty = v;
      saveCart(list);
      renderCart();
      updateTotals();
    }
  });

  updateTotals();
}

function updateTotals(){
  const list = loadCart();
  const t = calcTotals(list);
  document.getElementById("t-sub").textContent = money(t.subtotal);
  document.getElementById("t-disc").textContent = money(t.discount);
  document.getElementById("t-ship").textContent = money(t.shipping);
  document.getElementById("t-total").textContent = money(t.total);
}

document.getElementById("clear-cart")?.addEventListener("click", ()=>{
  if(confirm("Golești coșul?")){
    saveCart([]);
    renderCart();
  }
});

/* ===== Toggle PF / PJ ===== */
const pfBox = document.getElementById("pf-fields");
const pjBox = document.getElementById("pj-fields");

function setRequired(selector, state){
  document.querySelectorAll(selector).forEach(inp=>{
    if(state) inp.setAttribute("required","required");
    else inp.removeAttribute("required");
  });
}
function showPF(){
  pfBox.style.display = "";
  pjBox.style.display = "none";
  setRequired("#pf-fields input", true);
  setRequired("#pj-fields input", false);
}
function showPJ(){
  pfBox.style.display = "none";
  pjBox.style.display = "";
  setRequired("#pf-fields input", false);
  setRequired("#pj-fields input", true);
}

document.querySelectorAll('input[name="tip"]').forEach(r=>{
  r.addEventListener("change", (e)=>{
    if(e.target.value === "Persoană fizică") showPF();
    else showPJ();
  });
});
showPF(); // default

/* ====== GENERARE PROFORMĂ (HTML) ====== */
function proformaHTML(list, totals, client){
  const rows = list.map(p=>`
    <tr>
      <td>${p.title}</td>
      <td style="text-align:right">${money(p.price)}</td>
      <td style="text-align:center">${p.qty}</td>
      <td style="text-align:right">${money(p.price*p.qty)}</td>
    </tr>
  `).join("");

  const clientBlock = client.tip === 'Persoană juridică'
    ? `<p><b>Firmă:</b> ${client.firma}<br><b>CUI:</b> ${client.cui}</p>`
    : `<p><b>Nume:</b> ${client.nume} ${client.prenume}</p>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif">
    ${clientBlock}
    <p><b>Adresă:</b> ${client.adresa}, ${client.oras}, ${client.judet}, ${client.codpostal}</p>
    <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
      <thead>
        <tr style="background:#f5f5f5">
          <th align="left">Produs</th>
          <th align="right">Preț</th>
          <th align="center">Cant.</th>
          <th align="right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="3" align="right"><b>Subtotal</b></td><td align="right">${money(totals.subtotal)}</td></tr>
        <tr><td colspan="3" align="right"><b>Reducere</b></td><td align="right">− ${money(totals.discount)}</td></tr>
        <tr><td colspan="3" align="right"><b>Livrare</b></td><td align="right">${money(totals.shipping)}</td></tr>
        <tr><td colspan="3" align="right"><b>Total</b></td><td align="right"><b>${money(totals.total)}</b></td></tr>
      </tfoot>
    </table>
  </div>`;
}

/* ====== CHECKOUT ====== */
document.getElementById("checkout-form").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const list = loadCart();
  if(!list.length){ alert("Coșul este gol."); return; }

  // colectăm clientul
  const tip = document.querySelector('input[name="tip"]:checked').value;
  let client = { tip };
  if(tip === "Persoană fizică"){
    client.nume = document.getElementById("pf-nume").value.trim();
    client.prenume = document.getElementById("pf-prenume").value.trim();
    client.email = document.getElementById("pf-email").value.trim();
    client.telefon = document.getElementById("pf-telefon").value.trim();
    client.judet = document.getElementById("pf-judet").value.trim();
    client.oras = document.getElementById("pf-oras").value.trim();
    client.codpostal = document.getElementById("pf-codpostal").value.trim();
    client.adresa = document.getElementById("pf-adresa").value.trim();
  }else{
    client.firma = document.getElementById("pj-firma").value.trim();
    client.cui = document.getElementById("pj-cui").value.trim();
    client.email = document.getElementById("pj-email").value.trim();
    client.telefon = document.getElementById("pj-telefon").value.trim();
    client.judet = document.getElementById("pj-judet").value.trim();
    client.oras = document.getElementById("pj-oras").value.trim();
    client.codpostal = document.getElementById("pj-codpostal").value.trim();
    client.adresa = document.getElementById("pj-adresa").value.trim();
  }
  client.mentiuni = document.getElementById("mentiuni").value.trim();

  const totals = calcTotals(list);

  // ID comandă scurt
  const orderId = Math.random().toString(36).substring(2,8).toUpperCase();

  // HTML proformă
  const htmlProforma = proformaHTML(list, totals, client);

  // Parametri pentru template CLIENT (Order Confirmation)
  const paramsClient = {
    to_email: client.email,
    order_id: orderId,
    html_proforma: htmlProforma,
    nume: client.nume || client.firma || "",
  };

  // Parametri pentru template ADMIN (Contact Us) – câmpurile din șablonul tău
  const prodAdmin = list.map(p=>`${p.title} × ${p.qty} = ${money(p.price*p.qty)}`).join('<br>');
  const paramsAdmin = {
    tip: tip,
    nume: client.nume || client.firma || "",
    prenume: client.prenume || "",
    email: client.email,
    telefon: client.telefon,
    judet: client.judet,
    oras: client.oras,
    codpostal: client.codpostal,
    adresa: client.adresa,
    cui: client.cui || "",
    produse: prodAdmin,
    subtotal: totals.subtotal.toFixed(2),
    livrare: totals.shipping.toFixed(2),
    total: totals.total.toFixed(2),
    mentiuni: client.mentiuni || "",
    order_id: orderId
  };

  // Trimitem emailuri (întâi la client, apoi la admin)
  try{
    await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, paramsClient);
    await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, paramsAdmin);
  }catch(err){
    console.error(err);
    alert("A apărut o eroare la trimiterea emailurilor. Comanda a fost înregistrată, dar te rugăm să verifici emailul ulterior.");
  }

  // Golește coșul și redirecționează
  saveCart([]);
  window.location.href = "multumesc.html";
});

/* ====== inițializare ====== */
renderCart();
