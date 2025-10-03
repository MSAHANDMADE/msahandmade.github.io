// Setează automat anul curent în footer
document.getElementById("year").textContent = new Date().getFullYear();

// Dacă o imagine nu se încarcă, afișează un placeholder
document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("error", () => {
    const ph = document.createElement("div");
    ph.style.width = "100%";
    ph.style.aspectRatio = "4 / 3";
    ph.style.display = "grid";
    ph.style.placeItems = "center";
    ph.style.background = "#111827";
    ph.style.color = "#9ca3af";
    ph.style.font = "600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ph.textContent = "imagine indisponibilă";
    img.replaceWith(ph);
  });
});
