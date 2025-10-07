// ==== Actualizare contor coș pe toate paginile ====
document.addEventListener("DOMContentLoaded", () => {
  const count = document.getElementById("cart-count");
  if (count && window.MSACart) {
    const cart = MSACart.readCart();
    count.textContent = cart.reduce((s,i)=>s+(i.qty||1),0);
  }
});
