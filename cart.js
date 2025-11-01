/* MSA Handmade – cart.js (TOTAL ascuns prin CSS) */
(function(){
  const LS_KEY="msa_cart_v1";

  // EmailJS (din contul tău)
  const EMAILJS_PUBLIC_KEY="iSadfb7-TV_89l_6k";
  const EMAILJS_SERVICE_ID="service_ix0zpp7";
  const TEMPLATE_CLIENT_ID="template_9yctwor";
  const TEMPLATE_ADMIN_ID="template_13qpqtt";

  const rules={
    shippingFlat:17,
    freeShipFrom:300,
    discounts:[
      {min:400,pct:0.20},
      {min:300,pct:0.15},
      {min:200,pct:0.10},
    ],
  };

  const $=(s,r=document)=>r.querySelector(s);
  const $all=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const money=(n)=>`${n.toFixed(2)} RON`;
  const read=()=>{try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]");}catch{return[];}};
  const write=(a)=>localStorage.setItem(LS_KEY,JSON.stringify(a));
  const findIndex=(c,id)=>c.findIndex(i=>i.id===id);

  function addToCart(item,qty=1){const c=read();const i=findIndex(c,item.id);if(i>=0)c[i].qty+=qty;else c.push({id:item.id,name:item.name,price:+item.price||0,image:item.image||"",qty});write(c);updateCartCountBadge();return c;}
  function removeFromCart(id){const c=read().filter(i=>i.id!==id);write(c);updateCartCountBadge();return c;}
  function setQty(id,qty){qty=Math.max(0,+qty||0);const c=read();const i=findIndex(c,id);if(i>=0){if(qty===0)c.splice(i,1);else c[i].qty=qty;write(c);updateCartCountBadge();}return c;}
  function clearCart(){write([]);updateCartCountBadge();}

  function totals(cart){
    const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
    let disc=0;for(const r of rules.discounts){if(sub>=r.min){disc=sub*r.pct;break;}}
    const ship=(sub>=rules.freeShipFrom||sub===0)?0:rules.shippingFlat;
    const total=(sub-disc)+ship; return {sub,disc,ship,total};
  }

  function updateCartCountBadge(){const count=read().reduce((s,i)=>s+i.qty,0);const el=$("#cart-count");if(el)el.textContent=count;}

  function render(){
    const body=$("#cart-body"); if(!body) return;
    const cart=read();
    if(!cart.length){body.innerHTML=`<tr><td colspan="5">Coșul este gol.</td></tr>`;paintTotals({sub:0,disc:0,ship:rules.shippingFlat,total:rules.shippingFlat});return;}
    body.innerHTML=cart.map(rowHTML).join(""); bindRowEvents(); paintTotals(totals(cart));
  }

  function rowHTML(i){
    const line=i.price*i.qty;
    return `
      <tr data-id="${i.id}">
        <td>
          <div style="display:flex;gap:10px;align-items:center;">
            <img src="${i.image}" alt="" width="72" height="72" style="border-radius:8px;object-fit:cover;">
            <div class="prod-title"><b>${i.name}</b></div>
          </div>
        </td>
        <td>${money(i.price)}</td>
        <td>
          <div class="qty" role="group" aria-label="Cantitate">
            <button class="qminus" type="button" aria-label="Scade">−</button>
            <input class="qinput" inputmode="numeric" value="${i.qty}">
            <button class="qplus" type="button" aria-label="Crește">+</button>
          </div>
        </td>
        <td class="line-total">${money(line)}</td>
        <td><button class="qdel btn ghost" type="button" aria-label="Șterge">✕</button></td>
      </tr>`;
  }

  function bindRowEvents(){
    $all(".qminus").forEach(b=>b.addEventListener("click",()=>{const tr=b.closest("tr");const id=tr.dataset.id;const input=$(".qinput",tr);const next=Math.max(0,(+input.value||0)-1);input.value=next;setQty(id,next);rerenderRow(tr);}));
    $all(".qplus").forEach(b=>b.addEventListener("click",()=>{const tr=b.closest("tr");const id=tr.dataset.id;const input=$(".qinput",tr);const next=Math.max(0,(+input.value||0)+1);input.value=next;setQty(id,next);rerenderRow(tr);}));
    $all(".qinput").forEach(inp=>inp.addEventListener("change",()=>{const tr=inp.closest("tr");const id=tr.dataset.id;const val=Math.max(0,+inp.value||0);inp.value=val;setQty(id,val);rerenderRow(tr);}));
    $all(".qdel").forEach(b=>b.addEventListener("click",()=>{const tr=b.closest("tr");const id=tr.dataset.id;removeFromCart(id);tr.remove(); if(read().length===0)render(); else paintTotals(totals(read()));}));
  }

  function rerenderRow(tr){
    const id=tr.dataset.id; const cart=read(); const item=cart.find(x=>x.id===id);
    if(!item){tr.remove();render();return;}
    $(".line-total",tr).textContent=money(item.price*item.qty);
    paintTotals(totals(cart));
  }

  function paintTotals(t){
    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=typeof val==="number"?money(val):val;};
    set("t-sub",t.sub); set("t-disc",t.disc); set("t-ship",t.ship); set("t-total",t.total);
  }

  function buildProformaHTML(cart,t,data){
    const rows=cart.map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${money(i.price)}</td><td style="text-align:right">${money(i.price*i.qty)}</td></tr>`).join('');
    return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111">
      <h2 style="margin:0 0 10px">Proforma comandă – MSA Handmade</h2>
      <div style="font-size:14px;margin:0 0 12px">
        <b>Client:</b> ${data.nume||''} ${data.prenume||''} (${data.email||''})<br>
        <b>Telefon:</b> ${data.telefon||''}<br>
        <b>Adresă:</b> ${data.adresa||''}, ${data.oras||''}, ${data.judet||''}
      </div>
      <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;border:1px solid #ddd">
        <thead><tr style="background:#f7f7f7"><th align="left">Produs</th><th align="center">Cant.</th><th align="right">Preț</th><th align="right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" align="right"><b>Subtotal</b></td><td align="right">${money(t.sub)}</td></tr>
          <tr><td colspan="3" align="right"><b>Reducere</b></td><td align="right">-${money(t.disc)}</td></tr>
          <tr><td colspan="3" align="right"><b>Livrare</b></td><td align="right">${money(t.ship)}</td></tr>
          <tr><td colspan="3" align="right"><b>Total</b></td><td align="right"><b>${money(t.total)}</b></td></tr>
        </tfoot>
      </table>
      ${data.mentiuni?`<p style="margin-top:10px"><b>Mențiuni:</b> ${data.mentiuni}</p>`:''}
    </div>`;
  }

  function hookCheckout(formSel,btnSel){
    const form=$(formSel); const btn=$(btnSel); if(!form||!btn) return;

    form.addEventListener("submit",async(e)=>{
      e.preventDefault();
      const cart=read(); if(!cart.length){alert("Coșul este gol.");return;}
      const data=Object.fromEntries(new FormData(form).entries());
      const t=totals(cart);
      const html_proforma=buildProformaHTML(cart,t,data);
      const produse_text=cart.map(i=>`- ${i.name} x ${i.qty} = ${money(i.price*i.qty)}`).join('\n');
      const order_id=Math.random().toString(36).slice(2,8).toUpperCase();

      // trimite, dar NU blochează redirecția
      try{
        if(window.emailjs){
          emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
          emailjs.send(EMAILJS_SERVICE_ID,TEMPLATE_CLIENT_ID,{
            to_email:data.email,nume:data.nume||'',prenume:data.prenume||'',order_id,html_proforma
          }).catch(err=>console.warn("EmailJS client:",err));

          emailjs.send(EMAILJS_SERVICE_ID,TEMPLATE_ADMIN_ID,{
            tip:data.tip||'Persoană fizică',nume:data.nume||'',prenume:data.prenume||'',
            email:data.email||'',telefon:data.telefon||'',judet:data.judet||'',
            oras:data.oras||'',adresa:data.adresa||'',firma:data.firma||'',
            cui:data.cui||'',regcom:data.regcom||'',mentiuni:data.mentiuni||'',
            produse:produse_text,subtotal:t.sub.toFixed(2),livrare:t.ship.toFixed(2),total:t.total.toFixed(2)
          }).catch(err=>console.warn("EmailJS admin:",err));
        }
      }catch(err){ console.warn("EmailJS init:",err); }

      clearCart(); try{form.reset();}catch{}
      window.location.href="multumesc.html";
    });
  }

  window.MSACart={addToCart,removeFromCart,setQty,clearCart,render,hookCheckout,updateCartCountBadge};
  document.addEventListener("DOMContentLoaded",updateCartCountBadge);
})();
