(function () {
  "use strict";

  const fmtCLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  const fmtFecha = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return d && m && y ? `${d}-${m}-${y}` : iso;
  };

  // ---------- Utilidad para llamar a la API ----------
  async function apiFetch(url, options = {}) {
    const esFormData = options.body instanceof FormData;
    const headers = Object.assign({}, options.headers);
    const metodo = (options.method || "GET").toUpperCase();

    if (metodo !== "GET") headers["X-Requested-With"] = "mariachi-admin";
    if (!esFormData && options.body) headers["Content-Type"] = "application/json";

    const res = await fetch(url, { ...options, headers, credentials: "same-origin" });

    if (res.status === 401) {
      window.location.href = "login.html";
      throw new Error("No autenticado");
    }
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------- Sesión ----------
  async function verificarSesion() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!res.ok) { window.location.href = "login.html"; return; }
      const data = await res.json();
      document.getElementById("usuario-actual").textContent = `👤 ${data.usuario}`;
    } catch {
      window.location.href = "login.html";
    }
  }

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "login.html";
  });

  // ---------- Pestañas ----------
  const titulos = {
    resumen: "Resumen", reservas: "Reservas", testimonios: "Testimonios",
    galeria: "Galería", paquetes: "Paquetes", mensajes: "Mensajes",
  };
  const cargadores = {
    reservas: cargarReservas, testimonios: cargarTestimonios,
    galeria: cargarGaleria, paquetes: cargarPaquetes, mensajes: cargarMensajes,
  };

  document.querySelectorAll(".tab-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-link").forEach((b) => b.classList.toggle("activo", b === btn));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("activo", p.id === `tab-${tab}`));
      document.getElementById("titulo-tab").textContent = titulos[tab];
      if (cargadores[tab]) cargadores[tab]();
    });
  });

  // ---------- Resumen ----------
  async function cargarResumen() {
    const [reservas, testimonios, mensajes] = await Promise.all([
      apiFetch("/api/reservas").then((r) => r.data).catch(() => []),
      apiFetch("/api/testimonios/admin").then((r) => r.data).catch(() => []),
      apiFetch("/api/contacto").then((r) => r.data).catch(() => []),
    ]);

    const pendientes = reservas.filter((r) => r.estado === "pendiente").length;
    const testPendientes = testimonios.filter((t) => !t.aprobado).length;
    const mensajesNoLeidos = mensajes.filter((m) => !m.leido).length;
    const proxima = reservas.filter((r) => r.estado !== "cancelada").sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento))[0];

    document.getElementById("stats-grid").innerHTML = `
      <div class="stat-card"><div class="stat-card__numero">${pendientes}</div><div class="stat-card__etiqueta">Reservas pendientes</div></div>
      <div class="stat-card"><div class="stat-card__numero">${testPendientes}</div><div class="stat-card__etiqueta">Testimonios por aprobar</div></div>
      <div class="stat-card"><div class="stat-card__numero">${mensajesNoLeidos}</div><div class="stat-card__etiqueta">Mensajes sin leer</div></div>
      <div class="stat-card"><div class="stat-card__numero" style="font-size:1.3rem;">${proxima ? fmtFecha(proxima.fecha_evento) : "—"}</div><div class="stat-card__etiqueta">Próximo evento</div></div>
    `;

    setContador("contador-reservas", pendientes);
    setContador("contador-testimonios", testPendientes);
    setContador("contador-mensajes", mensajesNoLeidos);
  }

  function setContador(id, n) {
    const el = document.getElementById(id);
    el.textContent = n;
    el.hidden = n === 0;
  }

  // ---------- Reservas ----------
  async function cargarReservas() {
    const { data: reservas } = await apiFetch("/api/reservas");
    const tbody = document.getElementById("tabla-reservas-body");
    document.getElementById("reservas-vacio").hidden = reservas.length > 0;

    tbody.innerHTML = reservas.map((r) => `
      <tr data-id="${r.id}">
        <td>${escapeHTML(r.nombre_cliente)}${r.mensaje ? `<br><span style="color:var(--a-tinta-suave); font-size:0.82rem;">${escapeHTML(r.mensaje)}</span>` : ""}</td>
        <td>${escapeHTML(r.tipo_evento)}</td>
        <td>${fmtFecha(r.fecha_evento)}${r.hora_evento ? ` · ${escapeHTML(r.hora_evento)}` : ""}</td>
        <td>${escapeHTML(r.comuna || "—")}</td>
        <td>${escapeHTML(r.paquete_nombre || "—")}</td>
        <td>${escapeHTML(r.telefono)}${r.email ? `<br><span style="font-size:0.82rem;">${escapeHTML(r.email)}</span>` : ""}</td>
        <td>
          <select class="select-estado">
            ${["pendiente", "confirmada", "realizada", "cancelada"].map((e) => `<option value="${e}" ${e === r.estado ? "selected" : ""}>${e[0].toUpperCase() + e.slice(1)}</option>`).join("")}
          </select>
        </td>
        <td><button class="boton boton-peligro boton-chico btn-eliminar-reserva">Eliminar</button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".select-estado").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.closest("tr").dataset.id;
        const { ok } = await apiFetch(`/api/reservas/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado: sel.value }) });
        if (ok) cargarResumen();
      });
    });
    tbody.querySelectorAll(".btn-eliminar-reserva").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fila = btn.closest("tr");
        if (!confirm("¿Eliminar esta reserva?")) return;
        const { ok } = await apiFetch(`/api/reservas/${fila.dataset.id}`, { method: "DELETE" });
        if (ok) { fila.remove(); cargarResumen(); }
      });
    });
  }

  // ---------- Testimonios ----------
  async function cargarTestimonios() {
    const { data: testimonios } = await apiFetch("/api/testimonios/admin");
    const cont = document.getElementById("lista-testimonios");
    document.getElementById("testimonios-vacio").hidden = testimonios.length > 0;

    cont.innerHTML = testimonios.map((t) => `
      <div class="tarjeta-item" data-id="${t.id}">
        <div class="tarjeta-item__cuerpo">
          <div class="estrellas-mostrar">${"★".repeat(t.calificacion)}${"☆".repeat(5 - t.calificacion)}</div>
          <p style="margin:6px 0;">${escapeHTML(t.comentario)}</p>
          <div class="tarjeta-item__meta">${escapeHTML(t.nombre)}${t.comuna ? " · " + escapeHTML(t.comuna) : ""} — ${t.aprobado ? "Publicado" : "Pendiente de aprobación"}</div>
        </div>
        <div class="tarjeta-item__acciones">
          <button class="boton ${t.aprobado ? "boton-borde" : "boton-dorado"} boton-chico btn-aprobar">${t.aprobado ? "Ocultar" : "Aprobar"}</button>
          <button class="boton boton-peligro boton-chico btn-eliminar-testimonio">Eliminar</button>
        </div>
      </div>
    `).join("");

    cont.querySelectorAll(".btn-aprobar").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = btn.closest(".tarjeta-item");
        const aprobarAhora = btn.textContent.trim() === "Aprobar";
        const { ok } = await apiFetch(`/api/testimonios/${item.dataset.id}/aprobar`, { method: "PATCH", body: JSON.stringify({ aprobado: aprobarAhora }) });
        if (ok) { cargarTestimonios(); cargarResumen(); }
      });
    });
    cont.querySelectorAll(".btn-eliminar-testimonio").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = btn.closest(".tarjeta-item");
        if (!confirm("¿Eliminar este testimonio?")) return;
        const { ok } = await apiFetch(`/api/testimonios/${item.dataset.id}`, { method: "DELETE" });
        if (ok) { item.remove(); cargarResumen(); }
      });
    });
  }

  // ---------- Galería ----------
  async function cargarGaleria() {
    const { data: imagenes } = await apiFetch("/api/galeria");
    const grilla = document.getElementById("grilla-galeria-admin");

    grilla.innerHTML = imagenes.map((img) => `
      <div class="miniatura" data-id="${img.id}">
        <img src="/uploads/${encodeURIComponent(img.archivo)}" alt="${escapeHTML(img.descripcion || "")}" loading="lazy">
        <button class="btn-eliminar-foto" aria-label="Eliminar foto" title="Eliminar">✕</button>
      </div>
    `).join("") || `<div class="vacio" style="grid-column:1/-1;">Todavía no hay fotos en la galería.</div>`;

    grilla.querySelectorAll(".btn-eliminar-foto").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = btn.closest(".miniatura");
        if (!confirm("¿Eliminar esta foto?")) return;
        const { ok } = await apiFetch(`/api/galeria/${item.dataset.id}`, { method: "DELETE" });
        if (ok) item.remove();
      });
    });
  }

  document.getElementById("form-galeria").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const aviso = document.getElementById("aviso-galeria");
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;

    const fd = new FormData(form);
    const { ok, data } = await apiFetch("/api/galeria", { method: "POST", body: fd });

    aviso.hidden = false;
    if (ok) {
      aviso.className = "aviso exito";
      aviso.textContent = "Foto subida correctamente.";
      form.reset();
      cargarGaleria();
    } else {
      aviso.className = "aviso error";
      aviso.textContent = data.error || "No pudimos subir la foto.";
    }
    boton.disabled = false;
  });

  // ---------- Paquetes ----------
  async function cargarPaquetes() {
    const { data: paquetes } = await apiFetch("/api/paquetes/admin");
    const tbody = document.getElementById("tabla-paquetes-body");

    tbody.innerHTML = paquetes.map((p) => `
      <tr data-id="${p.id}">
        <td><input type="text" class="in-nombre" value="${escapeHTML(p.nombre)}"></td>
        <td><input type="text" class="in-descripcion" value="${escapeHTML(p.descripcion || "")}"></td>
        <td><input type="number" min="1" class="in-duracion" value="${p.duracion_minutos || ""}"></td>
        <td><input type="number" min="0" class="in-precio" value="${p.precio_clp}"></td>
        <td style="text-align:center;"><input type="checkbox" class="in-activo" ${p.activo ? "checked" : ""}></td>
        <td style="white-space:nowrap;">
          <button class="boton boton-borde boton-chico btn-guardar-paquete">Guardar</button>
          <button class="boton boton-peligro boton-chico btn-eliminar-paquete">✕</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-guardar-paquete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fila = btn.closest("tr");
        const cuerpo = {
          nombre: fila.querySelector(".in-nombre").value,
          descripcion: fila.querySelector(".in-descripcion").value,
          duracion_minutos: Number(fila.querySelector(".in-duracion").value) || null,
          precio_clp: Number(fila.querySelector(".in-precio").value) || 0,
          activo: fila.querySelector(".in-activo").checked,
        };
        const aviso = document.getElementById("aviso-paquetes");
        const { ok, data } = await apiFetch(`/api/paquetes/${fila.dataset.id}`, { method: "PUT", body: JSON.stringify(cuerpo) });
        aviso.hidden = false;
        aviso.className = ok ? "aviso exito" : "aviso error";
        aviso.textContent = ok ? "Paquete actualizado." : (data.error || "No pudimos guardar los cambios.");
      });
    });
    tbody.querySelectorAll(".btn-eliminar-paquete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fila = btn.closest("tr");
        if (!confirm("¿Eliminar este paquete?")) return;
        const { ok } = await apiFetch(`/api/paquetes/${fila.dataset.id}`, { method: "DELETE" });
        if (ok) fila.remove();
      });
    });
  }

  document.getElementById("btn-agregar-paquete").addEventListener("click", async () => {
    const cuerpo = {
      nombre: document.getElementById("np-nombre").value.trim(),
      descripcion: document.getElementById("np-descripcion").value.trim(),
      duracion_minutos: Number(document.getElementById("np-duracion").value) || null,
      precio_clp: Number(document.getElementById("np-precio").value) || 0,
    };
    const aviso = document.getElementById("aviso-paquetes");
    if (!cuerpo.nombre) {
      aviso.hidden = false; aviso.className = "aviso error"; aviso.textContent = "Ponle un nombre al paquete antes de agregarlo.";
      return;
    }
    const { ok, data } = await apiFetch("/api/paquetes", { method: "POST", body: JSON.stringify(cuerpo) });
    aviso.hidden = false;
    if (ok) {
      aviso.className = "aviso exito"; aviso.textContent = "Paquete agregado.";
      ["np-nombre", "np-descripcion", "np-duracion", "np-precio"].forEach((id) => (document.getElementById(id).value = ""));
      cargarPaquetes();
    } else {
      aviso.className = "aviso error"; aviso.textContent = data.error || "No pudimos agregar el paquete.";
    }
  });

  // ---------- Mensajes ----------
  async function cargarMensajes() {
    const { data: mensajes } = await apiFetch("/api/contacto");
    const cont = document.getElementById("lista-mensajes");
    document.getElementById("mensajes-vacio").hidden = mensajes.length > 0;

    cont.innerHTML = mensajes.map((m) => `
      <div class="tarjeta-item ${m.leido ? "" : "no-leido"}" data-id="${m.id}">
        <div class="tarjeta-item__cuerpo">
          <strong>${escapeHTML(m.nombre)}</strong>
          <p style="margin:6px 0;">${escapeHTML(m.mensaje)}</p>
          <div class="tarjeta-item__meta">${m.email ? escapeHTML(m.email) + " · " : ""}${m.telefono ? escapeHTML(m.telefono) : ""}</div>
        </div>
        <div class="tarjeta-item__acciones">
          ${m.leido ? "" : `<button class="boton boton-dorado boton-chico btn-marcar-leido">Marcar leído</button>`}
        </div>
      </div>
    `).join("");

    cont.querySelectorAll(".btn-marcar-leido").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = btn.closest(".tarjeta-item");
        const { ok } = await apiFetch(`/api/contacto/${item.dataset.id}/leido`, { method: "PATCH", body: JSON.stringify({ leido: true }) });
        if (ok) { cargarMensajes(); cargarResumen(); }
      });
    });
  }

  // ---------- Inicio ----------
  verificarSesion().then(cargarResumen);
})();
