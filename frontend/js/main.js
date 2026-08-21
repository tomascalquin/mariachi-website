// js/main.js
(function () {
  "use strict";

  const cfg = window.SITE_CONFIG || {};
  const fmtCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

  // ---------- Menú móvil ----------
  const toggle = document.getElementById("menu-toggle");
  const menuMovil = document.getElementById("menu-movil");
  if (toggle && menuMovil) {
    toggle.addEventListener("click", () => {
      const abierto = menuMovil.classList.toggle("abierto");
      toggle.setAttribute("aria-expanded", String(abierto));
    });
    menuMovil.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menuMovil.classList.remove("abierto");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---------- Poblar datos de configuración ----------
  function poblarConfig() {
    document.querySelectorAll('[data-site="nombreGrupo"]').forEach((el) => {
      el.textContent = cfg.nombreGrupo || el.textContent;
    });
    if (cfg.nombreGrupo) {
      document.title = `${cfg.nombreGrupo} — Música en vivo en la Región de O'Higgins`;
    }

    const mensajeWA = encodeURIComponent(
      `Hola${cfg.nombreGrupo ? " " + cfg.nombreGrupo : ""}, quisiera consultar disponibilidad para un evento.`
    );
    const linkWA = cfg.telefonoWhatsApp ? `https://wa.me/${cfg.telefonoWhatsApp}?text=${mensajeWA}` : "#";
    ["whatsapp-hero-link", "whatsapp-panel-link", "whatsapp-pie-link", "whatsapp-flotante", "whatsapp-rail-link", "whatsapp-topbar-link"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = linkWA;
    });

    const emailLink = document.getElementById("email-pie-link");
    const emailItem = document.getElementById("pie-email-item");
    if (cfg.email) {
      if (emailLink) { emailLink.href = `mailto:${cfg.email}`; emailLink.textContent = cfg.email; }
    } else if (emailItem) {
      emailItem.hidden = true;
    }

    const redes = document.getElementById("pie-redes");
    if (redes) {
      const iconos = {
        instagram: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 5 5C22 8.5 22 8.9 22 12.1s0 3.6-.07 4.9c-.15 3.3-1.7 4.8-5 5-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-5-5C2 15.7 2 15.3 2 12.1s0-3.6.07-4.9c.15-3.3 1.7-4.8 5-5C8.4 2.2 8.8 2.2 12 2.2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.3-8.4a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z"/></svg>',
        facebook: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8.4h2.8l.4-3.3h-3.2V7c0-.95.26-1.6 1.63-1.6H17V2.4C16.7 2.36 15.65 2.27 14.44 2.27c-2.5 0-4.24 1.53-4.24 4.34v2.7H7.4v3.3h2.8V21h3.3z"/></svg>',
        tiktok: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2h2.7c.2 1.6 1.3 3 3.3 3.3v2.7c-1.2 0-2.4-.4-3.3-1v6.7a5.3 5.3 0 11-5.3-5.3c.3 0 .6 0 .8.06v2.8a2.5 2.5 0 102 2.44V2z"/></svg>',
      };
      ["instagram", "facebook", "tiktok"].forEach((red) => {
        if (cfg[red]) {
          const a = document.createElement("a");
          a.href = cfg[red];
          a.target = "_blank";
          a.rel = "noopener";
          a.setAttribute("aria-label", red.charAt(0).toUpperCase() + red.slice(1));
          a.innerHTML = iconos[red];
          redes.appendChild(a);
        }
      });
    }

    const listaComunas = document.getElementById("lista-comunas");
    if (listaComunas && Array.isArray(cfg.comunasCobertura)) {
      listaComunas.innerHTML = cfg.comunasCobertura.map((c) => `<li>${c}</li>`).join("");
    }

    const anio = document.getElementById("anio-actual");
    if (anio) anio.textContent = new Date().getFullYear();

    // ---------- Sección de video ----------
    if (cfg.videoYouTube) {
      const seccion = document.getElementById("video");
      const frame = document.getElementById("video-frame");
      if (seccion && frame) {
        seccion.hidden = false;
        frame.innerHTML = `
          <iframe
            src="https://www.youtube.com/embed/${cfg.videoYouTube}?rel=0&modestbranding=1"
            title="Video de demostración — ${cfg.nombreGrupo || 'Mariachi'}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy">
          </iframe>`;
      }
    }
  }

  // ---------- Paquetes ----------
  async function cargarPaquetes() {
    const grilla = document.getElementById("grilla-paquetes");
    const selectPaquete = document.getElementById("r-paquete");
    if (!grilla) return;

    try {
      const res = await fetch(`${cfg.apiBaseUrl}/paquetes`);
      const paquetes = await res.json();

      if (!Array.isArray(paquetes) || paquetes.length === 0) {
        grilla.innerHTML = `<div class="estado-vacio">Muy pronto vas a ver acá los paquetes disponibles.</div>`;
        return;
      }

      grilla.innerHTML = paquetes.map((p) => `
        <div class="tarjeta-paquete">
          <h3>${escapeHTML(p.nombre)}</h3>
          <div class="tarjeta-paquete__precio">${fmtCLP.format(p.precio_clp || 0)}</div>
          ${p.duracion_minutos ? `<div class="tarjeta-paquete__duracion">${p.duracion_minutos} minutos</div>` : ""}
          <p>${escapeHTML(p.descripcion || "")}</p>
          <a href="#reservar" class="boton boton-fantasma">Reservar este paquete</a>
        </div>
      `).join("");

      const containerPaquetes = document.getElementById("paquetes-elegir");
      if (containerPaquetes) {
        // Mantenemos la opción por defecto ("Aún no sé") al principio
        const defaultOption = `
          <label class="paquete-radio">
            <input type="radio" name="paquete_id" value="" checked>
            <span class="paquete-radio__contenido">Aún no sé / a definir</span>
          </label>
        `;
        
        const radioOptions = paquetes.map((p) => `
          <label class="paquete-radio">
            <input type="radio" name="paquete_id" value="${p.id}">
            <span class="paquete-radio__contenido">
              <span class="paquete-radio__nombre">${escapeHTML(p.nombre)}</span>
              <span class="paquete-radio__precio">${fmtCLP.format(p.precio_clp || 0)}</span>
            </span>
          </label>
        `).join("");

        containerPaquetes.innerHTML = defaultOption + radioOptions;
      }
    } catch {
      grilla.innerHTML = `<div class="estado-vacio">No pudimos cargar los paquetes ahora. Intenta recargar la página.</div>`;
    }
  }

  // ---------- Galería ----------
  async function cargarGaleria() {
    const grilla = document.getElementById("grilla-galeria");
    if (!grilla) return;

    try {
      const res = await fetch(`${cfg.apiBaseUrl}/galeria`);
      const imagenes = await res.json();

      if (!Array.isArray(imagenes) || imagenes.length === 0) {
        grilla.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1;">Muy pronto vas a ver fotos de nuestras presentaciones aquí.</div>`;
        return;
      }

      grilla.innerHTML = imagenes.map((img) => {
        // "url" viene de Cloudinary en producción; fallback a /uploads/ en local
        const src = img.url || `/uploads/${encodeURIComponent(img.archivo)}`;
        return `
        <a href="${src}" target="_blank" rel="noopener">
          <img src="${src}" alt="${escapeHTML(img.descripcion || "Foto de presentación")}" loading="lazy">
        </a>`;
      }).join("");
    } catch {
      grilla.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1;">No pudimos cargar la galería ahora.</div>`;
    }
  }

  // ---------- Testimonios ----------
  async function cargarTestimonios() {
    const grilla = document.getElementById("grilla-testimonios");
    if (!grilla) return;

    try {
      const res = await fetch(`${cfg.apiBaseUrl}/testimonios`);
      const testimonios = await res.json();

      if (!Array.isArray(testimonios) || testimonios.length === 0) {
        grilla.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1;">Todavía no hay comentarios publicados. ¡Sé el primero en dejar uno!</div>`;
        return;
      }

      grilla.innerHTML = testimonios.map((t) => `
        <div class="tarjeta-testimonio">
          <div class="tarjeta-testimonio__estrellas" aria-label="${t.calificacion} de 5 estrellas">${"★".repeat(t.calificacion)}${"☆".repeat(5 - t.calificacion)}</div>
          <p>${escapeHTML(t.comentario)}</p>
          <div class="tarjeta-testimonio__autor">${escapeHTML(t.nombre)}</div>
          ${t.comuna ? `<div class="tarjeta-testimonio__comuna">${escapeHTML(t.comuna)}</div>` : ""}
        </div>
      `).join("");
    } catch {
      grilla.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1;">No pudimos cargar los testimonios ahora.</div>`;
    }
  }

  // ---------- Selector de estrellas (form de testimonio) ----------
  function initEstrellas() {
    const contenedor = document.getElementById("estrellas-elegir");
    const oculto = document.getElementById("t-calificacion");
    if (!contenedor || !oculto) return;

    const botones = [...contenedor.querySelectorAll("button")];
    function pintar(valor) {
      botones.forEach((b) => b.classList.toggle("activa", Number(b.dataset.valor) <= valor));
    }
    pintar(5);
    botones.forEach((b) => {
      b.addEventListener("click", () => {
        oculto.value = b.dataset.valor;
        pintar(Number(b.dataset.valor));
      });
    });
  }

  // ---------- Envío de formularios ----------
  function mostrarMensaje(el, texto, tipo) {
    el.textContent = texto;
    el.className = `mensaje-formulario ${tipo}`;
    el.hidden = false;
  }

  async function enviarJSON(url, datos) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data.error = `Error del servidor (Código ${res.status})`;
      }
      return { ok: res.ok, data };
    } catch (err) {
      return { ok: false, data: { error: "Error de red al conectar con el servidor." } };
    }
  }

  function initFormReserva() {
    const form = document.getElementById("form-reserva");
    const msg = document.getElementById("mensaje-reserva");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;

      const datos = Object.fromEntries(new FormData(form).entries());
      if (datos.paquete_id === "") delete datos.paquete_id;

      const { ok, data } = await enviarJSON(`${cfg.apiBaseUrl}/reservas`, datos);
      if (ok) {
        mostrarMensaje(msg, data.mensaje || "¡Gracias! Te contactaremos pronto.", "exito");
        form.reset();
      } else {
        mostrarMensaje(msg, data.error || "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.", "error");
      }
      boton.disabled = false;
    });
  }

  function initFormTestimonio() {
    const form = document.getElementById("form-testimonio");
    const msg = document.getElementById("mensaje-testimonio");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;

      const datos = Object.fromEntries(new FormData(form).entries());
      datos.calificacion = Number(datos.calificacion);

      const { ok, data } = await enviarJSON(`${cfg.apiBaseUrl}/testimonios`, datos);
      if (ok) {
        mostrarMensaje(msg, data.mensaje || "¡Gracias por tu comentario!", "exito");
        form.reset();
        document.getElementById("t-calificacion").value = 5;
        document.querySelectorAll("#estrellas-elegir button").forEach((b) => b.classList.add("activa"));
      } else {
        mostrarMensaje(msg, data.error || "No pudimos enviar tu comentario. Intenta de nuevo.", "error");
      }
      boton.disabled = false;
    });
  }

  function initFormContacto() {
    const form = document.getElementById("form-contacto");
    const msg = document.getElementById("mensaje-contacto");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;

      const datos = Object.fromEntries(new FormData(form).entries());

      const { ok, data } = await enviarJSON(`${cfg.apiBaseUrl}/contacto`, datos);
      if (ok) {
        mostrarMensaje(msg, data.mensaje || "¡Mensaje enviado! Te responderemos a la brevedad.", "exito");
        form.reset();
      } else {
        mostrarMensaje(msg, data.error || "No pudimos enviar tu mensaje. Intenta de nuevo.", "error");
      }
      boton.disabled = false;
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------- Inicio ----------
  document.addEventListener("DOMContentLoaded", () => {
    poblarConfig();
    cargarPaquetes();
    cargarGaleria();
    cargarTestimonios();
    initEstrellas();
    initFormReserva();
    initFormTestimonio();
    initFormContacto();
    initScrollAnimations();
    initTopbarScroll();
    initNavActivo();
  });

  // ---------- Animaciones al hacer scroll ----------
  function initScrollAnimations() {
    if (!("IntersectionObserver" in window)) return;
    const targets = document.querySelectorAll(
      ".tarjeta-paquete, .tarjeta-testimonio, .servicio-row, " +
      ".nosotros-texto, .nosotros-ilustracion, .galeria-item, " +
      ".servicios-encabezado, .testimonios-encabezado, " +
      ".form-side, .form-campo, .footer-item"
    );
    targets.forEach((el) => el.classList.add("will-animate"));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add("visible"), i * 60);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((el) => obs.observe(el));
  }

  // ---------- Topbar blur al hacer scroll ----------
  function initTopbarScroll() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    const onScroll = () => topbar.classList.toggle("scrolled", window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---------- Nav activo según sección visible ----------
  function initNavActivo() {
    const secciones = ["inicio", "nosotros", "servicios", "galeria", "testimonios", "reservar"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const links = document.querySelectorAll(".rail-nav a");
    if (!links.length || !secciones.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((a) => a.classList.toggle("activo", a.getAttribute("href") === "#" + e.target.id));
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    secciones.forEach((s) => obs.observe(s));
  }
})();
