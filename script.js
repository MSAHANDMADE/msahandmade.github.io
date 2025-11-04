/* =========================
   MSA Handmade – script.js
   (coș unic pe toate paginile)
   ========================= */

(function(){
  const STORAGE_KEYS_OLD = ['msacart','msa_cart','MSA_CART'];
  const STORAGE_KEY = 'MSA_CART_V1';

  // --------- Utils ---------
  const money = n => (Number(n)||0).toFixed(2) + ' RON';
  const qnum  = v => Math.max(1, parseInt(v,10) || 1);

  // Migrare din chei vechi (o singură dată)
  function migrateCart(){
    if(localStorage.getItem(STORAGE_KEY)) return;
    for(const k of STORAGE_KEYS_OLD){
      const old = localStorage.getItem(k);
      if(old){
        localStorage.setItem(STORAGE_KEY, old);
        try{ localStorage.removeItem(k); }catch(e){}
        break;
      }
    }
  }

  function load(){
    migrateCart();
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }catch(_){ return []; }
  }
  function save(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // --------- MSACart API ---------
  const MSACart = {
    getCart(){ return load(); },

    addToCart(prod, qty=1){
      if(!prod || !prod.id) return;
      const items = load();
      const idx = items.findIndex(x => x.id === prod.id);
      if(idx >= 0){
        items[idx].qty = qnum((items[idx].qty||1) + (qty||1));
      }else{
        items.push({
          id: prod.id,
          name: prod.name || 'Produs',
          price: Number(prod.price)||0,
          image: prod.image || '',
          qty: qnum(qty||1)
        });
      }
      save(items);
      this.updateBadge();
      return items;
    },

    removeFromCart(id){
      const items = load().filter(x => x.id !== id);
      save(items); this.updateBadge();
    },

    changeQty(id, delta){
      const items = load();
      const it = items.find(x => x.id===id);
      if(it){
        it.qty = qnum((it.qty||1) + (delta||0));
        save(items); this.updateBadge();
      }
    },

    setQty(id, val){
      const items = load();
      const it = items.find(x => x.id===id);
      if(it){
        it.qty = qnum(val);
        save(items); this.updateBadge();
      }
    },

    clear(){ save([]); this.updateBadge(); },

    getTotals(){
      const items = load();
      const subtotal = items.reduce((s,x)=>s + (Number(x.price)||0)*(x.qty||1), 0);
      // reduceri
      let reducere = 0;
      if(subtotal >= 400) reducere = subtotal * .20;
      else if(subtotal >= 300) reducere = subtotal * .15;
      else if(subtotal >= 200) reducere = subtotal * .10;

      // livrare (gratis de la 300 total după reducere)
      const dupaReducere = subtotal - reducere;
      let livrare = 19;
      if(dupaReducere >= 300 || subtotal === 0) livrare = 0;

      const total = Math.max(0, dupaReducere + livrare);

      return { subtotal, reducere, livrare, total, items };
    },

    // actualizează toate badge-urile
    updateBadge(){
      const count = load().reduce((s,x)=>s+(x.qty||1),0);
      document.querySelectorAll('#cart-count, .js-cart-count').forEach(el=>{
        el.textContent = String(count);
      });
    }
  };
  window.MSACart = MSACart;

  // --------- Auto-bind pe paginile cu produse ---------
  function getProductFromNode(node){
    // 1) direct pe buton
    const d = node.dataset || {};
    // 2) sau pe card (părintele cu .card)
    const card = node.closest('.card');
    const c = card ? (card.dataset || {}) : {};
    const id = d.id || c.id;
    if(!id) return null;
    return {
      id,
      name:  d.name  || c.name  || node.getAttribute('data-name') || (card && card.getAttribute('data-name')) || 'Produs',
      price: d.price || c.price || node.getAttribute('data-price')|| (card && card.getAttribute('data-price')) || 0,
      image: d.image || c.image || node.getAttribute('data-image')|| (card && card.getAttribute('data-image')) || ''
    };
  }

  function bindProductButtons(){
    // click delegat pentru .add și .add-to-cart
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('.add, .add-to-cart, [data-add="cart"]');
      if(!btn) return;

      const prod = getProductFromNode(btn);
      if(!prod){ console.warn('Nu găsesc datele produsului pe buton/card.'); return; }

      MSACart.addToCart({
        id: prod.id,
        name: prod.name,
        price: Number(prod.price)||0,
        image: prod.image
      }, 1);

      const old = btn.textContent;
      btn.textContent = 'Adăugat!';
      setTimeout(()=> btn.textContent = old, 900);
    });

    // modal generic (dacă există buton cu id m-add)
    const mAdd = document.getElementById('m-add');
    if(mAdd){
      mAdd.addEventListener('click', ()=>{
        const d = mAdd.dataset || {};
        if(!d.id){ console.warn('m-add fără data-id'); return; }
        MSACart.addToCart({ id:d.id, name:d.name, price:Number(d.price)||0, image:d.image }, 1);
      });
    }
  }

  // --------- Init pe fiecare pagină ---------
  document.addEventListener('DOMContentLoaded', ()=>{
    MSACart.updateBadge();
    bindProductButtons();
  });

})();
