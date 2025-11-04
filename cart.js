/* ===== MSA CART v2 (localStorage + UI) ===== */
;(() => {
  const KEY = 'msa_cart';

  const Cart = {
    config: {
      shippingFee: 0,            // dacă vrei taxă sub prag, schimbă aici (ex: 19)
      freeShipThreshold: 300,    // livrare gratuită de la
      discounts: [               // praguri reduceri
        { min: 400, rate: 0.20 },
        { min: 300, rate: 0.15 },
        { min: 200, rate: 0.10 },
      ],
    },

    /* --- storage --- */
    _load() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
      catch(e){ return []; }
    },
    _save(items) {
      localStorage.setItem(KEY, JSON.stringify(items));
      this.updateCartCountBadge();
    },

    /* --- api --- */
    getCart(){ return this._load(); },
    clear(){ this._save([]); this.renderCart(); },

    addToCart(item, qty = 1){
      const items = this._load();
      const i = items.findIndex(x => x.id === item.id);
      if (i >= 0) items[i].qty = (items[i].qty || 1) + qty;
      else items.push({ id:item.id, name:item.name, price:Number(item.price), image:item.image || '', qty: qty });
      this._save(items);
    },

    setQty(id, qty){
      qty = Math.max(1, Number(qty) || 1);
      const items = this._load();
      const i = items.findIndex(x => x.id === id);
      if (i >= 0){ items[i].qty = qty; this._save(items); }
      this.renderCart();
    },

    removeItem(id){
      const items = this._load().filter(x => x.id !== id);
      this._save(items);
      this.renderCart();
    },

    /* --- calc --- */
    _calcTotals(items){
      const subtotal = items.reduce((s,i)=> s + i.price * (i.qty||1), 0);
      // discount
      let rate = 0;
      for (const d of this.config.discounts) {
        if (subtotal >= d.min) { rate = d.rate; break; }
      }
      const discount = +(subtotal * rate).toFixed(2);
      const afterDiscount = subtotal - discount;

      // shipping: gratis de la threshold (după reducere)
      const shipping = afterDiscount >= this.config.freeShipThreshold ? 0 : this.config.shippingFee;

      const total = +(afterDiscount + shipping).toFixed(2);
      return {
        subtotal: +subtotal.toFixed(2),
        rate,
        discount,
        shipping,
        total,
      };
    },

    /* --- badge --- */
    updateCartCountBadge(){
      const el = document.getElementById('cart-count');
      if (!el) return;
      const items = this._load();
      const qty = items.reduce((s,i)=> s + (i.qty||1), 0);
      el.textContent = qty;
    },

    /* --- compat --- */
    readCart(){ this.updateCartCountBadge(); },

    /* --- render cart page --- */
    renderCart(mountId='cart-mount'){
      const mount = document.getElementById(mountId);
      if (!mount) { this.updateCartCountBadge(); return; }

      const items = this._load();
      const t = this._calcTotals(items);

      if (!items.length){
        mount.innerHTML = `<div class="box"><p>Coșul tău este gol.</p></div>`;
        this.updateCartCountBadge();
        return;
      }

      const rows = items.map(p=>`
        <div class="cart-card">
          <div class="cart-left"><img src="${p.image}" alt="${p.name}"></div>
          <div class="cart-mid">
            <div class="name">${p.name}</div>
            <div class="muted">${(+p.price).toFixed(2)} RON / buc</div>
          </div>
          <div class="cart-right">
            <div class="qty">
              <button class="qminus" data-id="${p.id}">−</button>
              <input type="number" min="1" value="${p.qty||1}" data-id="${p.id}">
              <button class="qplus" data-id="${p.id}">+</button>
            </div>
            <button class="danger remove" data-id="${p.id}">Șterge</button>
            <div class="line-total"><b>${(p.price*(p.qty||1)).toFixed(2)} RON</b></div>
          </div>
        </div>
      `).join('');

      mount.innerHTML = `
        <div class="box">
          ${rows}
          <div class="totals">
            <div class="row"><span>Subtotal</span><b>${t.subtotal.toFixed(2)} RON</b></div>
            <div class="row"><span>Reducere ${t.rate ? `(${Math.round(t.rate*100)}%)` : ''}</span><b>− ${t.discount.toFixed(2)} RON</b></div>
            <div class="row"><span>Livrare</span><b>${t.shipping.toFixed(2)} RON</b></div>
            <div class="row grand"><span>Total</span><b>${t.total.toFixed(2)} RON</b></div>
          </div>
          <div class="actions">
            <a class="btn ghost" href="produse.html">Continuă cumpărăturile</a>
            <a class="btn primary" href="#checkout">Continuă la detalii</a>
          </div>
        </div>
      `;

      // events
      mount.querySelectorAll('.qminus').forEach(b=>{
        b.addEventListener('click', ()=> {
          const id = b.dataset.id;
          const it = this._load().find(x=>x.id===id);
          const newQty = Math.max(1, (it?.qty||1) - 1);
          this.setQty(id, newQty);
        });
      });
      mount.querySelectorAll('.qplus').forEach(b=>{
        b.addEventListener('click', ()=> {
          const id = b.dataset.id;
          const it = this._load().find(x=>x.id===id);
          const newQty = (it?.qty||1) + 1;
          this.setQty(id, newQty);
        });
      });
      mount.querySelectorAll('.qty input').forEach(inp=>{
        inp.addEventListener('change', ()=> this.setQty(inp.dataset.id, inp.value));
      });
      mount.querySelectorAll('.remove').forEach(btn=>{
        btn.addEventListener('click', ()=> this.removeItem(btn.dataset.id));
      });

      this.updateCartCountBadge();
    },
  };

  // expune global
  window.MSACart = Cart;

  // init minimal
  document.addEventListener('DOMContentLoaded', () => {
    Cart.updateCartCountBadge();
  });
})();
