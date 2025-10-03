// anul din footer
document.getElementById("year").textContent = new Date().getFullYear();

// meniu mobil
const btn = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
btn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(open));
});

// scroll lin către #produse dacă URL are hash
if (location.hash) {
  const el = document.querySelector(location.hash);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// fallback sigur pentru imagini lipsă
document.querySelectorAll(".card img").forEach((img) => {
  img.addEventListener("error", () => {
    const ph = document.createElement("div");
    ph.style.width = "100%";
    ph.style.aspectRatio = "4 / 3";
    ph.style.display = "grid";
    ph.style.placeItems = "center";
    ph.style.background = "#0f172a";
    ph.style.color = "#9ca3af";
    ph.style.font = "600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ph.textContent = "imagine indisponibilă";
    img.replaceWith(ph);
  });
});
