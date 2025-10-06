/* MSA Handmade — script.js (binding butoane + an footer) */
document.addEventListener("DOMContentLoaded", function () {
  // an curent în footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // leagă butoanele "Adaugă în coș"
  function bindAddToCart() {
    document.querySelectorAll(".add-to-cart").forEach(btn => {
      if (btn._msaBound) return;
      btn._msaBound = true;

      btn.addEventListener("click", function () {
        const d = this.dataset;
        window.MSACart.addToCart({
          id: d.id,
          name: d.name,
          price: Number(d.price),
          image: d.image   // ← IMPORTANT: imaginea merge în coș!
        });

        const old = this.textContent;
        this.textContent = "Adăugat!";
        setTimeout(() => (this.textContent = old), 900);
      });
    });
  }

  bindAddToCart();
  // dacă pagina încarcă produse dinamic, poți reapela bindAddToCart()
});
