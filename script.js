// An afișat în footer
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  if (window.MSACart && window.MSACart.updateBadges) window.MSACart.updateBadges();
});
