/* Utilidades compartidas por todas las páginas */

const PLACEHOLDER = 'images/placeholder.svg';

/* Capas de mapa. Para uso comercial intenso conviene reemplazar las de Esri por un proveedor
   con cuenta propia (Mapbox, MapTiler, Google): solo hay que cambiar estas URLs. */
const TILES = {
  mapa: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; Colaboradores de OpenStreetMap',
    maxZoom: 19
  },
  satelite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  etiquetas: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19
  }
};

const nf = new Intl.NumberFormat('es-AR');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.json();
}

/* ---------- formatos ---------- */
function haTexto(c) { return `${nf.format(Number(c.superficie_ha) || 0)} ha`; }

function precioTexto(c) {
  if (c.precio_a_consultar || !Number(c.precio_usd)) return { total: 'Consultar precio', porHa: '' };
  const ha = Number(c.superficie_ha);
  return {
    total: `USD ${nf.format(Number(c.precio_usd))}`,
    porHa: ha > 0 ? `USD ${nf.format(Math.round(c.precio_usd / ha))} / ha` : ''
  };
}

function ubicacionTexto(c) {
  const partes = [c.localidad, c.partido && c.partido !== c.localidad ? c.partido : ''].filter(Boolean);
  return [partes.join(', '), c.provincia].filter(Boolean).join(' · ');
}

function fechaLarga(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }).replace('.', '');
}

function imagenPrincipal(c) {
  const img = Array.isArray(c.imagenes) ? c.imagenes[0] : '';
  return img || PLACEHOLDER;
}

function visible(c) {
  return c.estado !== 'Vendido' && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng));
}

function estadoClase(estado) {
  return { 'En venta': 'est-venta', 'En cartera': 'est-cartera', 'Reservado': 'est-reservado' }[estado] || '';
}

/* Markdown mínimo: "## título", listas con "- ", **negrita** y tablas con "| a | b |";
   los párrafos se separan con línea en blanco */
function mdLite(text) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let html = '', list = [], para = [], tbl = [];
  const flushP = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const flushL = () => { if (list.length) { html += `<ul class="bul">${list.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`; list = []; } };
  const flushT = () => {
    if (!tbl.length) return;
    const rows = tbl.map(l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()));
    const isSep = r => r.every(c => /^:?-{2,}:?$/.test(c));
    const head = rows.length > 1 && isSep(rows[1]) ? rows[0] : null;
    const body = rows.filter((r, i) => !isSep(r) && !(head && i === 0));
    /* una columna es numérica (alineada a la derecha) si todas las celdas con texto del cuerpo son números */
    const isNum = c => /^[-+]?[\d.,\s%]+$/.test(c);
    const ncol = Math.max(...rows.map(r => r.length));
    const numCol = Array.from({ length: ncol }, (_, j) => {
      const vals = body.map(r => r[j]).filter(Boolean);
      return vals.length > 0 && vals.every(isNum);
    });
    const cell = (tag, c, j) => `<${tag}${numCol[j] ? ' class="num"' : ''}>${inline(c)}</${tag}>`;
    html += `<div class="tbl-wrap"><table class="tbl">${head ? `<thead><tr>${head.map((c, j) => cell('th', c, j)).join('')}</tr></thead>` : ''}<tbody>${body.map(r => `<tr>${r.map((c, j) => cell('td', c, j)).join('')}</tr>`).join('')}</tbody></table></div>`;
    tbl = [];
  };
  const flush = () => { flushP(); flushL(); flushT(); };
  for (const raw of String(text || '').split('\n')) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    if (l.startsWith('## ')) { flush(); html += `<h2>${inline(l.slice(3))}</h2>`; continue; }
    if (l.startsWith('|')) { flushP(); flushL(); tbl.push(l); continue; }
    if (l.startsWith('- ')) { flushP(); flushT(); list.push(l.slice(2)); continue; }
    flushL(); flushT(); para.push(l);
  }
  flush();
  return html;
}

/* ---------- ambientes (colores) ---------- */
/* Convención del equipo: rojo = bajo, amarillo = medio, verde = alto. Cualquier otro nombre
   (clases 1 a 5, categorías de suelo, etc.) toma un color de la paleta, o el que se elija a mano. */
const AMB_COLORES = { bajo: '#bb4632', baja: '#bb4632', medio: '#d9a83a', media: '#d9a83a', alto: '#4f7a3d', alta: '#4f7a3d' };
const AMB_PALETA = ['#10284a', '#9c7a36', '#5f7d95', '#7a8f5c', '#a8553f', '#8a6f9e', '#4f8a8b', '#b8a98a'];
function ambienteColor(a, i, n = 1) {
  if (a && /^#[0-9a-f]{3,8}$/i.test(String(a.color || '').trim())) return String(a.color).trim();
  const nombre = String((a && a.nombre) || '').trim();
  const k = nombre.toLowerCase().replace(/^ambiente\s+/, '');
  if (AMB_COLORES[k]) return AMB_COLORES[k];
  /* clases ordenadas de peor a mejor ("1 - No apto" … "5 - Adecuado"): rampa rojo, amarillo, verde */
  if (/^\d/.test(nombre) && n > 1) {
    const t = i / (n - 1), [a1, b1, c1] = ['#bb4632', '#d9a83a', '#4f7a3d'].map(h => [1, 3, 5].map(p => parseInt(h.slice(p, p + 2), 16)));
    const [p, q, u] = t < 0.5 ? [a1, b1, t * 2] : [b1, c1, (t - 0.5) * 2];
    return '#' + p.map((v, j) => Math.round(v + (q[j] - v) * u).toString(16).padStart(2, '0')).join('');
  }
  return AMB_PALETA[i % AMB_PALETA.length];
}

function numAR(n, dec = 1) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('es-AR', { maximumFractionDigits: dec }) : '';
}

function informeEstadoClase(estado) {
  return { 'Borrador': 'est-reservado', 'En revisión': 'est-cartera', 'En seguimiento': 'est-cartera', 'Entregado': 'est-venta' }[estado] || '';
}

/* ---------- encabezado y pie ---------- */
function renderChrome(site, active) {
  const items = [
    ['inicio', 'index.html', 'Inicio'],
    ['informes', 'informes.html', 'Informes'],
    ['campos', 'campos.html', 'Campos'],
    ['equipo', 'index.html#equipo', 'Equipo']
  ];
  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `<div class="wrap">
      <a class="brand" href="index.html" aria-label="Inicio"><b>${esc(site.nombre)}</b><span>${esc(site.descriptor || '')}</span></a>
      <nav class="nav" id="nav" aria-label="Principal">
        ${items.map(([k, href, label]) => `<a href="${href}" class="${k === active ? 'on' : ''}">${label}</a>`).join('')}
      </nav>
      <a class="panel-link" href="admin/">Panel del equipo</a>
      <button class="menu-btn" type="button" aria-label="Menú" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>`;
    const nav = header.querySelector('#nav');
    const btn = header.querySelector('.menu-btn');
    btn.addEventListener('click', () => btn.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
    nav.addEventListener('click', e => {
      if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    const contacto = [site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : '', esc(site.telefono || '')].filter(Boolean).join(' · ');
    footer.innerHTML = `<div class="wrap">
      <div><b>${esc(site.nombre)}</b><span class="d">${esc(site.descriptor || '')}</span>${contacto ? `<p>${contacto}</p>` : ''}</div>
      <div><p><a href="informes.html">Informes</a> · <a href="campos.html">Campos</a> · <a href="admin/">Panel del equipo</a></p></div>
      <div class="small">© ${new Date().getFullYear()} ${esc(site.nombre)} · Sitio de trabajo interno · Datos satelitales: Copernicus Sentinel-2</div>
    </div>`;
  }
  document.title = `${document.title.split('·')[0].trim()} · ${site.nombre}`;
}

/* ---------- pines y mapa ---------- */
const PIN_COLORS = { 'En venta': '#10284a', 'En cartera': '#9c7a36', 'Reservado': '#7b8794' };

function pinIcon(estado) {
  const color = PIN_COLORS[estado] || PIN_COLORS['En venta'];
  const html = `
    <div class="pin">
      <svg viewBox="0 0 34 44" aria-hidden="true">
        <path d="M17 1C8.5 1 2 7.5 2 16c0 11 15 27 15 27s15-16 15-27C32 7.5 25.500 1 17 1z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="17" cy="16" r="8.5" fill="#fff"/>
        <g fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round">
          <path d="M11.500 13.500q5.500-2.200 11 0"/><path d="M11.500 16.800q5.500-2.200 11 0"/><path d="M11.500 20q5.500-2.200 11 0"/>
        </g>
      </svg>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -38] });
}

function createBaseMap(elementId, { fullscreenTarget, base = 'satelite' } = {}) {
  const map = L.map(elementId, { zoomControl: false, scrollWheelZoom: true, worldCopyJump: true });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const calles = L.tileLayer(TILES.mapa.url, { attribution: TILES.mapa.attribution, maxZoom: TILES.mapa.maxZoom });
  const sat = L.layerGroup([
    L.tileLayer(TILES.satelite.url, { attribution: TILES.satelite.attribution, maxZoom: TILES.satelite.maxZoom }),
    L.tileLayer(TILES.etiquetas.url, { maxZoom: TILES.etiquetas.maxZoom, pane: 'overlayPane' })
  ]);

  let current = null;
  const buttons = {};
  function setBase(name) {
    if (current === name) return;
    if (current) map.removeLayer(current === 'mapa' ? calles : sat);
    (name === 'mapa' ? calles : sat).addTo(map);
    current = name;
    Object.entries(buttons).forEach(([key, btn]) => btn.classList.toggle('on', key === name));
  }

  const Switch = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'base-switch');
      div.innerHTML = '<button type="button" data-b="mapa">Mapa</button><button type="button" data-b="satelite">Satélite</button>';
      div.querySelectorAll('button').forEach(b => { buttons[b.dataset.b] = b; });
      L.DomEvent.disableClickPropagation(div);
      div.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setBase(b.dataset.b); });
      return div;
    }
  });
  new Switch().addTo(map);

  if (fullscreenTarget) {
    const Full = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const btn = L.DomUtil.create('button', 'fs-btn');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Pantalla completa');
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
        L.DomEvent.disableClickPropagation(btn);
        const toggle = () => { fullscreenTarget.classList.toggle('full'); setTimeout(() => map.invalidateSize(), 60); };
        btn.addEventListener('click', toggle);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && fullscreenTarget.classList.contains('full')) toggle(); });
        return btn;
      }
    });
    new Full().addTo(map);
  }

  setBase(base);
  return { map, setBase };
}

function popupHTML(c) {
  const p = precioTexto(c);
  return `<div class="popup">
    <img src="${esc(imagenPrincipal(c))}" alt="" loading="lazy">
    <div class="pb">
      <strong>${esc(c.titulo)}</strong>
      <span>${esc(c.estado || '')} · ${esc(haTexto(c))}${c.uso ? ' · ' + esc(c.uso) : ''}</span>
      ${c.estado === 'En venta' ? `<span>${esc(p.total)}</span>` : ''}
      <a href="campo.html?id=${encodeURIComponent(c.id)}">Ver ficha →</a>
    </div></div>`;
}

/* Agrega los campos al mapa con agrupación de pines. Devuelve { cluster, markers, bounds } */
function addCampoMarkers(map, campos, { onClick } = {}) {
  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 48,
    iconCreateFunction: c => L.divIcon({ html: `<div class="cluster">${c.getChildCount()}</div>`, className: '', iconSize: [44, 44] })
  });
  const markers = new Map();
  const bounds = [];
  campos.forEach(c => {
    const m = L.marker([Number(c.lat), Number(c.lng)], { icon: pinIcon(c.estado), title: c.titulo })
      .bindPopup(popupHTML(c), { maxWidth: 260 });
    if (onClick) m.on('click', () => onClick(c));
    markers.set(c.id, m);
    cluster.addLayer(m);
    bounds.push([Number(c.lat), Number(c.lng)]);
  });
  map.addLayer(cluster);
  return { cluster, markers, bounds };
}

/* ---------- tarjetas ---------- */
function campoCardHTML(c, { mapBtn = true } = {}) {
  const p = precioTexto(c);
  const link = `campo.html?id=${encodeURIComponent(c.id)}`;
  return `<article class="card" data-id="${esc(c.id)}">
    <a class="card-img" href="${link}" style="background-image:url('${esc(imagenPrincipal(c))}')" aria-label="${esc(c.titulo)}">
      <span class="badges"><span class="tag ${estadoClase(c.estado)}">${esc(c.estado || '')}</span>${c.ejemplo ? '<span class="tag ej">Ejemplo</span>' : ''}</span>
    </a>
    <div class="card-body">
      <h3><a href="${link}">${esc(c.titulo)}</a></h3>
      <p class="loc">${esc(ubicacionTexto(c))}</p>
      <ul class="facts"><li>${esc(haTexto(c))}</li>${c.uso ? `<li>${esc(c.uso)}</li>` : ''}</ul>
      <div class="card-foot">
        <div class="price">${c.estado === 'En venta' ? esc(p.total) : ''}${c.estado === 'En venta' && p.porHa ? `<small>${esc(p.porHa)}</small>` : ''}</div>
        ${mapBtn ? `<button class="btn-map" type="button" data-id="${esc(c.id)}">Ver en mapa</button>` : ''}
      </div>
    </div></article>`;
}

function informeRowHTML(r, camposById) {
  const campo = r.campo_id && camposById ? camposById.get(r.campo_id) : null;
  const cifras = (r.cifras_clave || []).filter(c => c && c.valor).slice(0, 3)
    .map(c => `<b>${esc(c.valor)}</b>${c.etiqueta ? ' ' + esc(c.etiqueta) : ''}`).join(' · ');
  const donde = campo ? campo.titulo : (r.lugar || r.cliente || '');
  const estadoTag = r.estado && r.estado !== 'Entregado' ? `<span class="tag ${informeEstadoClase(r.estado)}">${esc(r.estado)}</span>` : '';
  return `<a class="rep-row" href="informe.html?id=${encodeURIComponent(r.id)}">
    <div class="rep-date">${esc(fechaCorta(r.fecha))}</div>
    <div class="rep-main"><h3>${esc(r.titulo)}</h3>${r.resumen ? `<p>${esc(r.resumen)}</p>` : ''}${cifras ? `<p class="rep-cifras">${cifras}</p>` : ''}</div>
    <div class="rep-side">
      <span style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag">${esc(r.tipo || 'Informe')}</span>${estadoTag}${r.ejemplo ? '<span class="tag ej">Ejemplo</span>' : ''}</span>
      ${donde ? `<small>${esc(donde)}</small>` : ''}
    </div></a>`;
}
