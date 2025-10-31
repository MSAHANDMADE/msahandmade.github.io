/* cart.js — MSA Handmade (stabil) */
(function () {
  const STORE_KEY = 'msa_cart_v1';
  const CURRENCY = 'RON';

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } }
  function save(it) { localStorage.setItem(STORE_KEY, JSON.stringify(it)); return it; }
  function fmt(n) { return `${n.toFixed(2)} ${CURRENCY}`; }

  let items = load(); // [{id,name,price,image,qty}]

  const byId = id => items.findIndex(i => i.id === id);

  function add(product, qty = 1) {
    qty = parseInt(qty, 10) || 1;
    const i = byId(product.id);
    if (i >= 0) items[i].qty += qty;
    else items.push({ id:String(product.id), name:product.name, price:Number(product.price||0), image:product.image||'', qty });
    save(items); render();
  }
  function updateQty(id, qty) {
    qty = Math.max(0, parseInt(qty, 10) || 0);
    const i = byId(id); if (i < 0) return;
    if (qty === 0) items.splice(i, 1); else items[i].qty = qty;
    save(items); render();
  }
  function clearCart(){ items = []; save(items); render(); }

  function totals(){
    const subtotal = items.reduce((s,i)=>s + i.price*i.qty, 0);
    const discount = subtotal>=400?subtotal*0.20: subtotal>=300?subtotal*0.15: subtotal>=200?subtotal*0.10: 0;
    const after = subtotal - discount;
    const shipping = subtotal===0 ? 0 : (after>=300 ? 0 : 17);
    const grand = after + shipping;
    return {subtotal, discount, shipping, grand};
  }

  function badge(){
    const el = document.getElementById('cart-count');
    if (el) el.textContent = items.reduce((s,i)=>s+i.qty,0);
  }

  function render(){
    badge();
    const body = document.getElementById('cart-body');
    if (!body) return; // nu suntem pe cos.html

    if (items.length === 0) {
      body.innerHTML = `<tr><td colspan="5">Coșul este gol.</td></tr>`;
    } else {
      body.innerHTML = items.map(it=>`
        <tr data-id="${it.id}">
          <td>
            <div style="display:flex;gap:12px;align-items:center">
              ${it.image?`<img src="${it.image}" alt="${it.name}" style="width:72px;height:72px;object-fit:cover;border-radius:8px">`:``}
              <div><div class="name" style="font-weight:700">${it.name}</div></div>
            </div>
          </td>
          <td>${fmt(it.price)}</td>
          <td>
            <div class="qty" style="display:inline-flex;align-items:center;border:1px solid #ddd;border-radius:10px;background:#fff;overflow:hidden;">
              <button class="qminus" type="button" aria-label="Scade" style="width:36px;height:36px;border:0;background:#f6f6f6;font-weight:800;">−</button>
              <input class="qval" type="number" inputmode="numeric" min="0" value="${it.qty}" style="width:54px;height:36px;border:0;text-align:center;font-size:16px">
              <button class="qplus" type="button" aria-label="Crește" style="width:36px;height:36px;border:0;background:#f6f6f6;font-weight:800;">+</button>
            </div>
          </td>
          <td class="line-total">${fmt(it.price*it.qty)}</td>
          <td></td>
        </tr>`).join('');
    }

    const t = totals();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
    set('t-sub', t.subtotal);
    set('t-disc', t.discount);
    set('t-ship', t.shipping);
    set('t-total', t.grand);

    body.querySelectorAll('tr').forEach(tr=>{
      const id = tr.getAttribute('data-id');
      tr.querySelector('.qminus')?.addEventListener('click', ()=>{
        const cur = parseInt(tr.querySelector('.qval').value||'0',10)||0;
        updateQty(id, Math.max(0, cur-1));
      });
      tr.querySelector('.qplus')?.addEventListener('click', ()=>{
        const cur = parseInt(tr.querySelector('.qval').value||'0',10)||0;
        updateQty(id, cur+1);
      });
      tr.querySelector('.qval')?.addEventListener('input', e=> updateQty(id, e.target.value));
    });
  }

  // butoane .add-to-cart (oriunde în site)
  document.addEventListener('click', e=>{
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const id = btn.dataset.id, name = btn.dataset.name, price = parseFloat(btn.dataset.price), image = btn.dataset.image||'';
    if (!id || !name || isNaN(price)) { console.warn('Lipsesc data-id/data-name/data-price pe .add-to-cart'); return; }
    add({id,name,price,image}, parseInt(btn.dataset.qty||'1',10)||1);
  });

  window.MSACart = {
    add, updateQty, clearCart, render,
    getItems: ()=>items.slice(),
    getTotals: totals,
    hookCheckout(formSel, btnSel){
      const form = document.querySelector(formSel), btn = document.querySelector(btnSel);
      if (!form) return;
      form.addEventListener('submit', e=>{
        e.preventDefault();
        btn && (btn.disabled=true);
        const payload = {
          items: items.slice(),
          totals: totals(),
          data: Object.fromEntries(new FormData(form).entries()),
          createdAt: new Date().toISOString()
        };
        console.log('ORDER', payload); // aici trimiți cu EmailJS/backend
        alert('Mulțumim! Comanda a fost înregistrată.');
        clearCart();
        btn && (btn.disabled=false);
      });
    }
  };

  window.addEventListener('load', render);
})();
