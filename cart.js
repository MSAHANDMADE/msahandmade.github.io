/* MSA Handmade – cart.js (restaurat) */
(function(){
  const LS_KEY="msa_cart_v1";

  // EmailJS – valorile tale
  const EMAILJS_PUBLIC_KEY="iSadfb7-TV_89l_6k";
  const EMAILJS_SERVICE_ID="service_ix0zpp7";
  const TEMPLATE_CLIENT_ID="template_9yctwor";  // Order Confirmation (către client)
  const TEMPLATE_ADMIN_ID="template_13qpqtt";   // Contact Us (către tine)

  const rules={
    shippingFlat:17,
    freeShipFrom:300, // livrare 0 de la 300 chiar dacă există reducere (aplicăm pe subtotal)
    discounts:[
      {min:400,pct:0.20},
      {min:300,pct:0.15},
      {min:200,pct:0.10},
    ],
  };

  // ---------- Utils ----------
  const $=(s,r=document)=>r.querySelector(s);
  const $all=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const money=(n)=>`${n.toFixed(2)} RON`;

  const read=()=>{try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]");}catch{return[];}};
  const write=(arr)=>localStorage.setItem(LS_KEY,JSON.stringify(arr));
  const findIndex=(cart,id)=>cart.findIndex(i=>i.id===id);

  // ---------- Core ----------
  function addToCart(item,qty=1){
    const cart=read();
    const i=findIndex(cart,item.id);
    if(i>=0){ cart[i].qty+=qty; }
    else{
      cart.push({ id:item.id, name:item.name, price:Number(item.price)||0, image:item.image||"", qty });
    }
    write(cart); updateCartCountBadge(); return cart;
  }

  function removeFromCart(id){ const cart=read().filter(i=>i.id!==id); write(cart); updateCartCountBadge(); return cart; }

  function setQty(id,qty){
    qty=Math.max(0,Number(qty)||0);
    const cart=read(); const i=findIndex(cart,id);
    if(i>=0){ if(qty===0) cart.splice(i,1); else cart[i].qty=qty; write(cart); updateCartCountBadge(); }
    return cart;
  }

  function clearCart(){ write([]); updateCartCountBadge(); }

  function totals(cart){
    const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
    let disc=0; for(const r of rules.discounts){ if(sub>=r.min){ disc=sub*r.pct; break; } } // prag maxim
    // LIVRARE: gratuită dacă SUBTOTAL >= 300 (indiferent de reducere)
    const ship=(sub>=rules.freeShipFrom || sub===0) ? 0 : rules.shippingFlat;
    const total=(sub-disc)+ship;
    return { sub, disc, ship, total };
  }

  // ---------- Badge ----------
  function updateCartCountBadge(){ const count=read().reduce((s,i)=>s+i.qty,0); const el=$("#cart-count"); if(el) el.textContent=count; }

  // ---------- Render ----------
  function render(){
    const body=$("#cart-body"); if(!body) return;
    const cart=read();

    if(!cart.length){
      body.innerHTML=`<tr><td colspan="5">Coșul este gol.</td></tr>`;
      paintTotals({ sub:0, disc:0, ship:rules.shippingFlat, total:rules.shippingFlat });
      return;
    }

    body.innerHTML=cart.map(rowHTML).join("");
    bindRowEvents();
    paintTotals(totals(cart));
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
      </tr>
    `;
  }

  function bindRowEvents(){
    $all(".qminus").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const tr=btn.closest("tr"); const id=tr.dataset.id;
        const input=$(".qinput",tr);
        const next=Math.max(0, Number(input.value||0)-1);
        input.value=next; setQty(id,next); rerenderRow(tr);
      });
    });
    $all(".qplus").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const tr=btn.closest("tr"); const id=tr.dataset.id;
        const input=$(".qinput",tr);
        const next=Math.max(0, Number(input.value||0)+1);
        input.value=next; setQty(id,next); rerenderRow(tr);
      });
    });
    $all(".qinput").forEach(inp=>{
      inp.addEventListener("change",()=>{
        const tr=inp.closest("tr"); const id=tr.dataset.id;
        const val=Math.max(0, Number(inp.value||0));
        inp.value=val; setQty(id,val); rerenderRow(tr);
      });
    });
    $all(".qdel").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const tr=btn.closest("tr"); const id=tr.dataset.id;
        removeFromCart(id); tr.remove();
        if(read().length===0) render(); else paintTotals(totals(read()));
      });
    });
  }

  function rerenderRow(tr){
    const id=tr.dataset.id; const cart=read(); const item=cart.find(x=>x.id===id);
    if(!item){ tr.remove(); render(); return; }
    $(".line-total",tr).textContent=money(item.price*item.qty);
    paintTotals(totals(cart));
  }

  function paintTotals(t){
    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=typeof val==="number"?money(val):val; };
    set("t-sub",t.sub); set("t-disc",t.disc); set("t-ship",t.ship); set("t-total",t.total);
  }

  // ---------- Proforma ----------
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

  // ---------- Checkout ----------
  function hookCheckout(formSel,submitBtnSel){
    const form=$(formSel); const btn=$(submitBtnSel); if(!form||!btn) return;

    form.addEventListener("submit",async(e)=>{
      e.preventDefault();
      const cart=read(); if(!cart.length){ alert("Coșul este gol."); return; }

      const data=Object.fromEntries(new FormData(form).entries());
      const t=totals(cart);
      const html_proforma=buildProformaHTML(cart,t,data);
      const produse_text=cart.map(i=>`- ${i.name} x ${i.qty} = ${money(i.price*i.qty)}`).join('\n');
      const order_id=Math.random().toString(36).slice(2,8).toUpperCase();

      // trimite emailuri, dar nu blochează redirecția
      try{
        if(window.emailjs){
          emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

          // client
          emailjs.send(EMAILJS_SERVICE_ID,TEMPLATE_CLIENT_ID,{
            to_email:data.email,
            nume:data.nume||'',
            prenume:data.prenume||'',
            order_id,
            html_proforma
          }).catch(err=>console.warn("EmailJS client:",err));

          // admin
          emailjs.send(EMAILJS_SERVICE_ID,TEMPLATE_ADMIN_ID,{
            tip:data.tip||'Persoană fizică',
            nume:data.nume||'',prenume:data.prenume||'',
            email:data.email||'',telefon:data.telefon||'',
            judet:data.judet||'',oras:data.oras||'',adresa:data.adresa||'',
            firma:data.firma||'',cui:data.cui||'',regcom:data.regcom||'',
            mentiuni:data.mentiuni||'',
            produse:produse_text,
            subtotal:t.sub.toFixed(2),
            livrare:t.ship.toFixed(2),
            total:t.total.toFixed(2)
          }).catch(err=>console.warn("EmailJS admin:",err));
        }
      }catch(err){ console.warn("EmailJS init:",err); }

      alert("Comanda a fost trimisă. Îți mulțumim!");
      clearCart(); try{ form.reset(); }catch{}
      window.location.href="multumesc.html";
    });
  }

  // ---------- API public ----------
  window.MSACart={ addToCart, removeFromCart, setQty, clearCart, render, hookCheckout, updateCartCountBadge };

  document.addEventListener("DOMContentLoaded", updateCartCountBadge);
})();
