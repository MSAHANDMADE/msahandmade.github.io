/* ====================================
   MSA Handmade – script.js (v13)
   Coș unic + badge + randare coș
   ==================================== */

(function(){
  const STORAGE_KEYS_OLD = ['msacart','msa_cart','MSA_CART'];
  const STORAGE_KEY = 'MSA_CART_V1';

  const money = n => (Number(n)||0).toFixed(2) + ' RON';
  const qnum  = v => Math.max(1, parseInt(v,10) || 1);

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
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(_){ return []; }
  }
  function save(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  const MSACart = {
    getCart(){ return load(); },
    addToCart(prod, qty=1){
      if(!prod || !prod.id) return;
      const items = load();
      const i = items.findIndex(x=>x.id===prod.id);
      if(i>=0){ items[i].qty = qnum((items[i].qty||1) + (qty||1)); }
      else{
        items.push({
          id: prod.id, name: prod.name||'Produs',
          price: Number(prod.price)||0, image: prod.image||'',
          qty: qnum(qty||1)
        });
      }
      save(items); this.updateBadge();
      return items;
    },
    removeFromCart(id){
      save(load().filter(x=>x.id!==id)); this.updateBadge();
    },
    changeQty(id, delta){
      const items = load();
      const it = items.find(x=>x.id===id);
      if(it){ it.qty = qnum((it.qty||1)+(delta||0)); save(items); this.updateBadge(); }
    },
    setQty(id, val){
      const items = load();
      const it = items.find(x=>x.id===id);
      if(it){ it.qty = qnum(val); save(items); this.updateBadge(); }
    },
    clear(){ save([]); this.updateBadge(); },
    getTotals(){
      const items = load();
      const subtotal = items.reduce((s,x)=>s+(Number(x.price)||0)*(x.qty||1),0);
      let reducere = 0;
      if(subtotal>=400) reducere=subtotal*.20;
      else if(subtotal>=300) reducere=subtotal*.15;
      else if(subtotal>=200) reducere=subtotal*.10;
      const dupa = subtotal - reducere;
      let livrare = (dupa>=300 || subtotal===0) ? 0 : 19;
      const total = Math.max(0, dupa + livrare);
      return { subtotal, reducere, livrare, total, items };
    },
    updateBadge(){
      const count = load().reduce((s,x)=>s+(x.qty||1),0);
      document.querySelectorAll('#cart-count, .js-cart-count').forEach(el=>{
        el.textContent = String(count);
      });
    }
  };
  window.MSACart = MSACart;

  // butoane "Adaugă în coș" (.add, .add-to-cart sau [data-add="cart"])
  function getProductFromNode(node){
    const d = node.dataset||{};
    const card = node.closest('.card');
    const c = card ? (card.dataset||{}) : {};
    const id = d.id || c.id;
    if(!id) return null;
    return {
      id,
      name:  d.name  || c.name  || node.getAttribute('data-name')  || (card&&card.getAttribute('data-name'))  || 'Produs',
      price: d.price || c.price || node.getAttribute('data-price') || (card&&card.getAttribute('data-price')) || 0,
      image: d.image || c.image || node.getAttribute('data-image') || (card&&card.getAttribute('data-image')) || ''
    };
  }
  function bindProductButtons(){
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('.add, .add-to-cart, [data-add="cart"]');
      if(!btn) return;
      const p = getProductFromNode(btn);
      if(!p){ console.warn('Buton fără data-* pe el/card.'); return; }
      MSACart.addToCart({ id:p.id, name:p.name, price:Number(p.price)||0, image:p.image }, 1);
      const old = btn.textContent; btn.textContent='Adăugat!'; setTimeout(()=>btn.textContent=old,900);
    });
  }

  // dacă suntem pe cos.html și există elementele cu ID-urile de mai jos, randează coșul
  function tryRenderCartPage(){
    const tbody = document.getElementById('cart-body');
    const subEl = document.getElementById('subval');
    const disEl = document.getElementById('discval');
    const shpEl = document.getElementById('shipval');
    const totEl = document.getElementById('totval');
    if(!tbody || !subEl || !disEl || !shpEl || !totEl) return; // nu suntem pe pagina de coș/nu avem markup

    function fmt(n){ return money(n); }

    function render(){
      const items = MSACart.getCart();
      if(items.length===0){
        tbody.innerHTML = `<tr><td colspan="4" class="muted">Coșul este gol.</td></tr>`;
      }else{
        tbody.innerHTML = items.map(it=>`
          <tr data-id="${it.id}">
            <td>
              <div style="display:flex;gap:10px;align-items:center">
                <img src="${it.image||''}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px">
                <div><strong>${it.name||''}</strong><br><small>${fmt(it.price||0)}</small></div>
              </div>
            </td>
            <td class="qty">
              <button class="qminus" aria-label="minus">−</button>
              <input type="number" min="1" value="${it.qty||1}">
              <button class="qplus" aria-label="plus">+</button>
            </td>
            <td><button class="btn ghost remove">Șterge</button></td>
            <td style="text-align:right"><strong>${fmt((it.price||0)*(it.qty||1))}</strong></td>
          </tr>
        `).join('');
      }
      const t = MSACart.getTotals();
      subEl.textContent = fmt(t.subtotal);
      disEl.textContent = '-' + fmt(t.reducere);
      shpEl.textContent = fmt(t.livrare);
      totEl.textContent = fmt(t.total);

      // evenimente pe rânduri
      tbody.querySelectorAll('tr').forEach(row=>{
        const id = row.dataset.id;
        row.querySelector('.qminus')?.addEventListener('click', ()=>{ MSACart.changeQty(id,-1); render(); });
        row.querySelector('.qplus') ?.addEventListener('click', ()=>{ MSACart.changeQty(id, 1); render(); });
        row.querySelector('input')  ?.addEventListener('change', e=>{ MSACart.setQty(id, e.target.value); render(); });
        row.querySelector('.remove')?.addEventListener('click', ()=>{ MSACart.removeFromCart(id); render(); });
      });
    }

    render();
    MSACart.updateBadge();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    MSACart.updateBadge();
    bindProductButtons();
    tryRenderCartPage();
  });
})();
