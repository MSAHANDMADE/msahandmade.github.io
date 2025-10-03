// An în footer
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});

// Meniu (opțional)
document.querySelector(".menu-toggle")?.addEventListener("click", function(){
  const nav = document.querySelector(".nav");
  const exp = this.getAttribute("aria-expanded")==="true";
  this.setAttribute("aria-expanded", String(!exp));
  nav?.classList.toggle("open");
});

// EmailJS init (cheile tale)
(function initEmailJS(){
  try{
    if (window.emailjs && typeof emailjs.init==="function") {
      emailjs.init("iSadfb7-TV_89l_6k"); // PUBLIC KEY
    }
  }catch(e){}
})();
