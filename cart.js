<!-- cart.js -->
<script>
(function(){
  const CART_KEY_NEW = 'msa_cart_v1';
  const CART_KEY_OLD = 'msa_cart';

  function readRaw() {
    try {
      // compat: citește mai întâi noua cheie, apoi vechea
      const a = localStorage.getItem(CART_KEY_NEW);
      if (a) return JSON.parse(a);
      const b = localStorage.getItem(CART_KEY_OLD);
      if (b) return JSON.parse(b);
    } catch(e){}
    return { items: [] };
  }
  function writeRaw(state){
    try {
      const s = JSON.stringify(state);
      localStorage.setItem(CART_KEY_NEW, s);
      // compat: scriem și în vechea cheie
      localStorage.setItem(CART_KEY_OLD, s);
    } catch(e){}
  }

  const S = {
    get(){ const st = readRaw(); if(!st.items) st.items=[]; return st; },
    save(st){ writeRaw(st); }
  };

  const MSACart = {
    getCart(){
      return S.get().items || [];
    },
    clear(){
      S.save({items:[]});
      MSACart.updateCartCountBadge();
    },
    addToCart(prod, qty=1){
      if(!prod || !prod.id) return;
      const st = S.get();
      const q = Math.max(1, Number(qty)||1);
      const i = st.items.findIndex(x=>x.id===prod.id);
      if(i>-1){
        st.items[i].qty += q;
      }else{
        st.items.push({
          id: prod.id,
          name: prod.name || '',
          price: Number(prod.price)||0,
          image: prod.image || '',
          qty: q
        });
      }
      S.save(st);
      MSACart.updateCartCountBadge();
    },
    setQty(id, qty){
      const st=S.get();
      const it = st.items.find(x=>x.id===id);
      if(!it) return;
      it.qty = Math.max(1, Number(qty)||1);
      S.save(st);
      MSACart.updateCartCountBadge();
    },
    changeQty(id, delta){
      const st=S.get();
      const it = st.items.find(x=>x.id===id);
      if(!it) return;
      it.qty = Math.max(1, (it.qty||1) + (Number(delta)||0));
      S.save(st);
      MSACart.updateCartCountBadge();
    },
    removeFromCart(id){
      const st=S.get();
      st.items = st.items.filter(x=>x.id!==id);
      S.save(st);
      MSACart.updateCartCountBadge();
    },
    getTotals(){
      const items = MSACart.getCart();
      const subtotal = items.reduce((s,x)=> s + (Number(x.price)||0)*(Number(x.qty)||1), 0);
      // reguli reduceri (păstrează-le cum le aveai)
      let reducere = 0;
      if (subtotal >= 400) reducere = 0.20*subtotal;
      else if (subtotal >= 300) reducere = 0.15*subtotal;
      else if (subtotal >= 200) reducere = 0.10*subtotal;
      const afterDisc = subtotal - reducere;

      // livrare: 0 peste 300 RON
      const livrare = afterDisc >= 300 ? 0 : 25;

      const total = afterDisc + livrare;
      return { subtotal, reducere, livrare, total };
    },
    updateCartCountBadge(){
      const el = document.querySelector('#cart-count');
      if(!el) return;
      const items = MSACart.getCart();
      const count = items.reduce((s,x)=> s + (Number(x.qty)||0), 0);
      el.textContent = count;
    }
  };

  // expune global
  window.MSACart = MSACart;

  // auto-init la încărcare
  document.addEventListener('DOMContentLoaded', MSACart.updateCartCountBadge);
})();
</script>
