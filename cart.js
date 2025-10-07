// ==============================
//  M.S.A Handmade - CART SYSTEM
// ==============================

(function() {
  // Inițializare EmailJS
  emailjs.init("SERVICE_USER_ID_TAU"); // <-- pune user ID-ul tău din EmailJS (ex: "M5nxxxxx...")

  const CART_KEY = "msa_cart";
  const SERVICE_ID = "service_xxxxxx";   // <-- ID serviciu EmailJS
  const TEMPLATE_CLIENT = "template_client"; // <-- ID template client
  const TEMPLATE_ADMIN = "template_admin";   // <-- ID template admin
  const ADMIN_EMAIL = "msahandmade.contact@gmail.com";

  // Helper
  const $ = sel => document.querySelector(sel);
  const format = n => n.toFixed(2);

  // ===============================
  //  Structura principală a coșului
  // ===============================
  window.MSACart = {
    readCart() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
      catch { return []; }
    },
    saveCart(list) {
      localStorage.setItem(CART_KEY, JSON.stringify(list));
      this.updateCount();
    },
    updateCount() {
      const list = this.readCart();
      const el = document.getElementById("cart-count");
      if (el) el.textContent = list.length;
    },
    addItem(prod) {
      const list = this.readCart();
      const exist = list.find(p => p.id === prod.id);
      if (exist) exist.qty += 1;
      else list.push({ ...prod, qty: 1 });
      this.saveCart(list);
      alert("Produs adăugat în coș!");
    },
    clearCart() {
      localStorage.removeItem(CART_KEY);
      this.updateCount();
    },
    calcTotals(list) {
      let subtotal = 0;
      list.forEach(p => subtotal += p.price * p.qty);
      let reducere = 0;
      let livrare = 17;

      if (subtotal >= 400) reducere = subtotal * 0.2;
      else if (subtotal >= 300) { reducere = subtotal * 0.15; livrare = 0; }
      else if (subtotal >= 200) reducere = subtotal * 0.10;

      const total = subtotal - reducere + livrare;
      return { subtotal, reducere, livrare, total };
    },

    render() {
      this.updateCount();
      const list = this.readCart();
      const cont = $("#items");
      if (!cont) return;
      if (!list.length) {
        cont.innerHTML = "<p>Coșul este gol 🛒</p>";
        $("#subtot").textContent = $("#disc").textContent = "0.00";
        $("#ship").textContent = "17.00";
        $("#grand").textContent = "17.00";
        return;
      }

      cont.innerHTML = list.map(p => `
        <div class="cart-card">
          <div class="cart-left"><img src="${p.image}" alt="${p.name}"></div>
          <div class="cart-mid">
            <div class="name">${p.name}</div>
            <div class="price">${format(p.price)} RON</div>
            <div class="qty">
              <button class="minus" data-id="${p.id}">−</button>
              <input type="text" readonly value="${p.qty}">
              <button class="plus" data-id="${p.id}">+</button>
            </div>
          </div>
        </div>`).join("");

      const totals = this.calcTotals(list);
      $("#subtot").textContent = format(totals.subtotal);
      $("#disc").textContent = format(totals.reducere);
      $("#ship").textContent = format(totals.livrare);
      $("#grand").textContent = format(totals.total);

      cont.querySelectorAll(".minus").forEach(btn => btn.onclick = () => {
        const l = this.readCart();
        const item = l.find(p => p.id === btn.dataset.id);
        if (item) {
          item.qty = Math.max(1, item.qty - 1);
          this.saveCart(l); this.render();
        }
      });
      cont.querySelectorAll(".plus").forEach(btn => btn.onclick = () => {
        const l = this.readCart();
        const item = l.find(p => p.id === btn.dataset.id);
        if (item) {
          item.qty++;
          this.saveCart(l); this.render();
        }
      });
    },

    // ===============================
    //  Generare și trimitere proformă
    // ===============================
    async submitOrder(formData) {
      const list = this.readCart();
      const totals = this.calcTotals(list);
      const orderId = Math.random().toString(36).substring(2,7).toUpperCase();

      // 1) Construcție proformă HTML
      const proforma_html = `
        <h2>Comandă nouă pe <a href="https://msahandmade.ro">msahandmade.ro</a></h2>
        <p><strong>Nr. comandă:</strong> #${orderId}</p>
        <h3>Date client</h3>
        <p>
          Tip: ${formData.get("tip")}<br>
          Nume: ${formData.get("nume")} ${formData.get("prenume")}<br>
          Email: ${formData.get("email")}<br>
          Telefon: ${formData.get("telefon")}<br>
          Județ: ${formData.get("judet")}<br>
          Oraș: ${formData.get("oras")}<br>
          Cod poștal: ${formData.get("codpostal")}<br>
          Adresă: ${formData.get("adresa")}<br>
          ${formData.get("firma") ? `Firmă: ${formData.get("firma")}<br>` : ""}
          ${formData.get("cui") ? `CUI: ${formData.get("cui")}<br>` : ""}
          ${formData.get("regcom") ? `Reg.Com: ${formData.get("regcom")}<br>` : ""}
        </p>

        <h3>Comandă</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
          <tr><th>Produs</th><th>Cant.</th><th>Preț</th><th>Total</th></tr>
          ${list.map(p => `
            <tr>
              <td>${p.name}</td>
              <td align="center">${p.qty}</td>
              <td align="right">${format(p.price)} RON</td>
              <td align="right">${format(p.price * p.qty)} RON</td>
            </tr>`).join("")}
        </table>

        <p>
          <strong>Subtotal:</strong> ${format(totals.subtotal)} RON<br>
          <strong>Reducere:</strong> ${format(totals.reducere)} RON<br>
          <strong>Livrare:</strong> ${format(totals.livrare)} RON<br>
          <strong>Total:</strong> ${format(totals.total)} RON
        </p>

        <p><strong>Mențiuni:</strong> ${formData.get("mentiuni") || "–"}</p>
      `;

      // 2) Trimite la CLIENT
      // 2) Trimite la CLIENT
await emailjs.send(SERVICE_ID, TEMPLATE_CLIENT, {
  to_email: formData.get("email"),
  order_id: orderId,
  nume: formData.get("nume"),
  html_proforma: proforma_html // <- schimbat numele variabilei!
});
    

      // 3) Trimite la ADMIN
      await emailjs.send(SERVICE_ID, TEMPLATE_ADMIN, {
        to_email: ADMIN_EMAIL,
        order_id: orderId,
        nume: formData.get("nume"),
        proforma_html
      });

      // 4) Curăță coșul și redirect
      this.clearCart();
      window.location.href = "multumim.html";
    }
  };

  // Butoane adăugare în coș (doar în pag. produse)
  document.addEventListener("click", e => {
    const b = e.target.closest(".add-to-cart");
    if (!b) return;
    MSACart.addItem({
      id: b.dataset.id,
      name: b.dataset.name,
      price: parseFloat(b.dataset.price),
      image: b.dataset.image
    });
  });

  // Actualizează număr coș în nav
  document.addEventListener("DOMContentLoaded", ()=>MSACart.updateCount());
})();
