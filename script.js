<script>
// ==========================
//  MSA Handmade – script.js
// ==========================

(function(){
  const STORAGE_KEY = 'msa_cart_v1';

  // --------- Helpers storage ---------
  function readCart(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(_){ return []; }
  }
  function writeCart(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // --------- API public (global) ---------
  const MSACart = {
    // ia toate itemele
    getCart(){ return readCart(); },

    // adaugă (sau crește cantitatea)
    addToCart(prod, qty=1){
      if(!prod || !prod.id) return;
      qty = Number(qty)||1;
      const items = readCart();
      const i = items.findIndex(x=>x.id===prod.id);
      if(i>-1){
        items[i].qty += qty;
      }else{
        items.push({
          id: prod.id,
          name: prod.name||'Produs',
          price: Number(prod.price)||0,
          image: prod.image||'',
          qty
        });
      }
      writeCart(items);
      MSACart.updateCartCountBadge();
    },

    // setează cantitatea exact
    setQty(id, qty){
      qty = Math.max(0, Number(qty)||0);
      const items = readCart();
      const i = items.findIndex(x=>x.id===id);
      if(i>-1){
        if(qty<=0) items.splice(i,1);
        else items[i].qty = qty;
        writeCart(items);
        MSACart.updateCartCountBadge();
      }
    },

    // schimbă cu +1/-1
    changeQty(id, delta){
      delta = Number(delta)||0;
      const items = readCart();
      const i = items.findIndex(x=>x.id===id);
      if(i>-1){
        items[i].qty += delta;
        if(items[i].qty<=0) items.splice(i,1);
        writeCart(items);
        MSACart.updateCartCountBadge();
      }
    },

    // șterge
    removeFromCart(id){
      const items = readCart().filter(x=>x.id!==id);
      writeCart(items);
      MSACart.updateCartCountBadge();
    },

    // golește
    clear(){
      writeCart([]);
      MSACart.updateCartCountBadge();
    },

    // totaluri + reguli promo + livrare
    getTotals(){
      const items = readCart();
      const subtotal = items.reduce((s,i)=>s + i.price*i.qty, 0);
      // reduceri: ≥200 -10%, ≥300 -15%, ≥400 -20%
      let reducere = 0;
      if(subtotal >= 400) reducere = subtotal*0.20;
      else if(subtotal >= 300) reducere = subtotal*0.15;
      else if(subtotal >= 200) reducere = subtotal*0.10;

      // livrare gratuită de la 300 RON (chiar dacă există reducere)
      let livrare = subtotal >= 300 ? 0 : 20; // poți schimba taxa de bază dacă vrei

      const total = Math.max(0, subtotal - reducere + livrare);
      return {
        items,
        subtotal,
        reducere,
        livrare,
        total
      };
    },

    // badge-ul din meniu (toate elementele #cart-count)
    updateCartCountBadge(){
      const count = readCart().reduce((s,i)=>s+i.qty, 0);
      document.querySelectorAll('#cart-count').forEach(el=>{
        el.textContent = count;
      });
    }
  };

  // fă-l global
  window.MSACart = MSACart;

  // --------- Bindează butoanele „Adaugă în coș” ---------
  function bindAddButtons(){
    // variante:
    // 1) <button class="add" data-id data-name data-price data-image>
    document.querySelectorAll('button.add').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const p = {
          id: btn.dataset.id,
          name: btn.dataset.name,
          price: Number(btn.dataset.price||0),
          image: btn.dataset.image||''
        };
        MSACart.addToCart(p, 1);
        const old = btn.textContent;
        btn.textContent = 'Adăugat!';
        setTimeout(()=>btn.textContent=old, 900);
      });
    });

    // 2) card cu data-* pe container + .add-to-cart înăuntru
    document.querySelectorAll('.add-to-cart').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const card = btn.closest('[data-id]');
        if(!card) return;
        const p = {
          id: card.dataset.id,
          name: card.dataset.name,
          price: Number(card.dataset.price||0),
          image: card.dataset.image||''
        };
        MSACart.addToCart(p, 1);
        const old = btn.textContent;
        btn.textContent = 'Adăugat!';
        setTimeout(()=>btn.textContent=old, 900);
      });
    });
  }

  // --------- Init pe fiecare pagină ---------
  document.addEventListener('DOMContentLoaded', ()=>{
    MSACart.updateCartCountBadge();
    bindAddButtons();
  });

})();
</script>
