<script>
/* =========================================
   MSA Handmade — script.js (unic & final)
   - stochează coșul în localStorage (cheie fixă)
   - expune window.MSACart
   - leagă automat butoanele de "Adaugă în coș"
   ========================================= */

(function(){
  const STORAGE_KEY = 'msa_cart_v1';

  // ------- storage -------
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(_) { return []; }
  };
  const write = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  // ------- API -------
  const MSACart = {
    getCart(){ return read(); },
    clear(){ write([]); MSACart.updateBadge(); },

    addToCart(prod, qty=1){
      if(!prod || !prod.id) return;
      const items = read();
      const i = items.findIndex(x=>x.id===prod.id);
      qty = Math.max(1, Number(qty)||1);
      if(i>-1) items[i].qty += qty;
      else items.push({ id:prod.id, name:prod.name||'Produs', price:Number(prod.price)||0, image:prod.image||'', qty });
      write(items);
      MSACart.updateBadge();
    },

    setQty(id, qty){
      const items = read();
      const i = items.findIndex(x=>x.id===id);
      if(i<0) return;
      qty = Math.max(0, Number(qty)||0);
      if(qty===0) items.splice(i,1);
      else items[i].qty = qty;
      write(items);
      MSACart.updateBadge();
    },

    changeQty(id, delta){
      const items = read();
      const i = items.findIndex(x=>x.id===id);
      if(i<0) return;
      items[i].qty += (Number(delta)||0);
      if(items[i].qty<=0) items.splice(i,1);
      write(items);
      MSACart.updateBadge();
    },

    getTotals(){
      const items = read();
      const subtotal = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||0), 0);
      let reducere = 0;
      if(subtotal >= 400) reducere = subtotal*0.20;
      else if(subtotal >= 300) reducere = subtotal*0.15;
      else if(subtotal >= 200) reducere = subtotal*0.10;
      const after = subtotal - reducere;
      const livrare = after >= 300 ? 0 : 20; // modifică dacă vrei altă taxă
      const total = Math.max(0, after + livrare);
      return { subtotal, reducere, livrare, total };
    },

    updateBadge(){
      const count = read().reduce((s,i)=> s + (Number(i.qty)||0), 0);
      document.querySelectorAll('#cart-count').forEach(el => el.textContent = count);
    }
  };
  window.MSACart = MSACart;

  // ------- Autolink butoane pe paginile de produse -------
  function bindAddButtons(){
    // Varianta A: <button class="add" data-id data-name data-price data-image>
    document.querySelectorAll('button.add').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const p = {
          id: btn.dataset.id,
          name: btn.dataset.name,
          price: Number(btn.dataset.price||0),
          image: btn.dataset.image||''
        };
        MSACart.addToCart(p, 1);
        const old = btn.textContent; btn.textContent='Adăugat!'; setTimeout(()=>btn.textContent=old, 900);
      });
    });

    // Varianta B: cardul are data-* pe container + <button class="add-to-cart">
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
        const old = btn.textContent; btn.textContent='Adăugat!'; setTimeout(()=>btn.textContent=old, 900);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    MSACart.updateBadge();
    bindAddButtons();
  });
})();
</script>
