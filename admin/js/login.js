(function () {
  "use strict";

  const form = document.getElementById("form-login");
  const aviso = document.getElementById("aviso-login");

  // Si ya hay una sesión activa, saltar directo al panel.
  fetch("/api/auth/me", { credentials: "same-origin" }).then((res) => {
    if (res.ok) window.location.href = "dashboard.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    aviso.hidden = true;
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    boton.textContent = "Ingresando...";

    const datos = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(datos),
      });
      const data = await res.json();

      if (res.ok) {
        window.location.href = "dashboard.html";
        return;
      }
      aviso.textContent = data.error || "No pudimos iniciar sesión.";
      aviso.hidden = false;
    } catch {
      aviso.textContent = "No pudimos conectar con el servidor. Intenta de nuevo.";
      aviso.hidden = false;
    } finally {
      boton.disabled = false;
      boton.textContent = "Ingresar";
    }
  });
})();
