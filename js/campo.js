(async function () {
  const $ = id => document.getElementById(id);
  const root = $('detail');
  const id = new URLSearchParams(location.search).get('id');

  let site, campos = [], informes = [];
  try {
    const [s, c, i] = await Promise.all([loadJSON('data/site.json'), loadJSON('data/campos.json'), loadJSON('data/informes.json')]);
    site = s; campos = c.campos || []; informes = i.informes || [];
  } catch (err) {
    root.innerHTML = `<div class="empty">No se pudieron cargar los datos.<br><small>${esc(err.message)}</small></div>`;
    return;
  }
  renderChrome(site, 'campos');

  const c = campos.find(x => x.id === id);
  if (!c) {
    root.innerHTML = '<div class="empty"><h2>No encontramos ese campo</h2><p><a href="campos.html">Volver al mapa</a></p></div>';
    return;
  }
  document.title = `${c.titulo} · ${site.nombre}`;

  const p = precioTexto(c);
  const relacionados = informes.filter(r => r.campo_id === c.id)
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  const imgs = (Array.isArray(c.imagenes) && c.imagenes.length) ? c.imagenes : [PLACEHOLDER];
  const feats = (c.caracteristicas || []).map(t => `<li>${esc(t)}</li>`).join('');
  const mail = site.email ? `mailto:${esc(site.email)}?subject=${encodeURIComponent('Consulta: ' + c.titulo)}` : '';

  /* detalle de lotes (opcional) */
  const lotes = (c.lotes || []).filter(l => l && l.nombre);
  const lotesHA = lotes.reduce((s, l) => s + (Number(l.hectareas) || 0), 0);
  const lotesHTML = lotes.length ? `<h2>Lotes</h2>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Lote</th><th class="num">ha</th>${lotes.some(l => l.nota) ? '<th>Nota</th>' : ''}</tr></thead>
      <tbody>${lotes.map(l => `<tr><td>${esc(l.nombre)}</td><td class="num">${l.hectareas ? numAR(l.hectareas, 2) : ''}</td>${lotes.some(x => x.nota) ? `<td>${esc(l.nota || '')}</td>` : ''}</tr>`).join('')}</tbody>
      ${lotesHA ? `<tfoot><tr><td>Total de lotes</td><td class="num">${numAR(lotesHA, 2)}</td>${lotes.some(x => x.nota) ? '<td></td>' : ''}</tr></tfoot>` : ''}
    </table></div>` : '';

  /* bloque de informe satelital (opcional) */
  function satelitalHTML() {
    const s = c.satelital;
    if (!s) return '';
    const amb = s.ambientes || {};
    const vals = { baja: Number(amb.baja) || 0, media: Number(amb.media) || 0, alta: Number(amb.alta) || 0 };
    const sumAmb = vals.baja + vals.media + vals.alta;
    const total = Number(c.superficie_ha) || 0;
    const prod = Number(s.superficie_productiva_ha) || sumAmb;
    const noProd = Math.max(total - prod, 0);
    const hist = (s.historial || []).filter(h => Number.isFinite(Number(h.ndvi)));
    if (!prod && !hist.length && !s.mapa) return '';
    const fmt1 = n => nf.format(Math.round(n * 10) / 10);
    const colors = { baja: '#bb4632', media: '#d9a83a', alta: '#4f7a3d' };
    const names = { baja: 'Ambiente bajo', media: 'Ambiente medio', alta: 'Ambiente alto' };

    const tiles = `<div class="sat-tiles">
      <div class="sat-tile"><span>Superficie del lote</span><b>${fmt1(total)} ha</b></div>
      <div class="sat-tile"><span>Productiva real</span><b>${fmt1(prod)} ha</b>${total ? `<small>${Math.round(prod / total * 100)} % del lote</small>` : ''}</div>
      <div class="sat-tile"><span>No productiva</span><b>${fmt1(noProd)} ha</b>${s.no_productiva_detalle ? `<small>${esc(s.no_productiva_detalle)}</small>` : ''}</div>
    </div>`;

    const ambientes = sumAmb ? `<div><h4>Ambientes de productividad</h4>
      <div class="amb-bar" role="img" aria-label="Distribución de ambientes">
        ${['baja', 'media', 'alta'].map(k => `<i style="width:${vals[k] / sumAmb * 100}%;background:${colors[k]}"></i>`).join('')}
      </div>
      <div class="amb-legend">
        ${['baja', 'media', 'alta'].map(k => `<span><i style="background:${colors[k]}"></i>${names[k]} · ${fmt1(vals[k])} ha (${Math.round(vals[k] / sumAmb * 100)} %)</span>`).join('')}
      </div></div>` : '';

    const mapa = s.mapa ? `<div><h4>Mapa de ambientes</h4><img class="sat-map" src="${esc(s.mapa)}" alt="Mapa de ambientes de productividad" loading="lazy"></div>` : '';

    let chart = '';
    if (hist.length) {
      const W = 560, H = 190, padL = 30, padB = 28, padT = 16;
      const bw = (W - padL) / hist.length;
      const y = v => padT + (H - padT - padB) * (1 - Math.min(Math.max(v, 0), 1));
      chart = `<div><h4>Vigor por campaña (NDVI medio en el período crítico)</h4>
        <svg class="sat-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="NDVI medio por campaña">
          ${[0, 0.25, 0.5, 0.75, 1].map(g => `<line x1="${padL}" x2="${W}" y1="${y(g)}" y2="${y(g)}" stroke="#d8dde6" stroke-width="1"/><text x="${padL - 6}" y="${y(g) + 4}" text-anchor="end">${String(g).replace('.', ',')}</text>`).join('')}
          ${hist.map((h, i) => {
            const v = Number(h.ndvi), x = padL + i * bw + bw * 0.18, w = bw * 0.64;
            return `<rect x="${x}" y="${y(v)}" width="${w}" height="${H - padB - y(v)}" fill="#10284a"/>
              <text class="val" x="${x + w / 2}" y="${y(v) - 5}" text-anchor="middle">${v.toFixed(2).replace('.', ',')}</text>
              <text x="${x + w / 2}" y="${H - 9}" text-anchor="middle">${esc(h.campana || '')}</text>`;
          }).join('')}
        </svg></div>`;
    }

    const fechaS = s.fecha ? new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '';
    return `<h2>Informe satelital</h2>
      <div class="sat">
        ${tiles}${ambientes}${mapa}${chart}
        ${s.observaciones ? `<p class="sat-note"><b>Observaciones.</b> ${esc(s.observaciones)}</p>` : ''}
        <p class="sat-note">Productividad relativa observada con imágenes Copernicus Sentinel-2${fechaS ? ` (análisis de ${esc(fechaS)})` : ''}. No reemplaza un análisis de suelo ni un mapa de rendimiento.</p>
      </div>`;
  }

  root.innerHTML = `
    <div class="crumbs"><a href="campos.html">← Todos los campos</a></div>
    ${c.ejemplo ? '<div class="notice"><b>Campo de ejemplo.</b> Los datos de esta ficha son inventados para probar el sitio. Borralo desde el panel cuando cargues campos reales.</div>' : ''}
    <div class="detail-head">
      <div>
        <div class="badges"><span class="tag ${estadoClase(c.estado)}">${esc(c.estado || '')}</span></div>
        <h1>${esc(c.titulo)}</h1>
        <p class="loc">${esc(ubicacionTexto(c))}</p>
      </div>
      ${c.estado === 'En venta' ? `<div class="detail-price"><div class="price">${esc(p.total)}${p.porHa ? `<small>${esc(p.porHa)}</small>` : ''}</div></div>` : ''}
    </div>

    <div class="detail-grid">
      <div style="min-width:0">
        <div class="gallery">
          <div class="main" id="gal-main" style="background-image:url('${esc(imgs[0])}')"></div>
          ${imgs.length > 1 ? `<div class="thumbs" id="thumbs">${imgs.map((src, i) =>
            `<button type="button" class="${i === 0 ? 'on' : ''}" data-i="${i}" style="background-image:url('${esc(src)}')" aria-label="Foto ${i + 1}"></button>`).join('')}</div>` : ''}
        </div>
        <div class="desc">
          <div class="facts-grid" style="margin-top:28px">
            <div class="fact"><span>Superficie</span><b>${esc(haTexto(c))}</b></div>
            <div class="fact"><span>Uso</span><b>${esc(c.uso || '—')}</b></div>
            <div class="fact"><span>Provincia</span><b>${esc(c.provincia || '—')}</b></div>
            <div class="fact"><span>Partido / departamento</span><b>${esc(c.partido || '—')}</b></div>
          </div>
          ${c.descripcion ? `<h2>Descripción</h2>${mdLite(c.descripcion)}` : ''}
          ${feats ? `<h2>Características</h2><ul class="chips">${feats}</ul>` : ''}
          ${lotesHTML}
          ${satelitalHTML()}
          <h2>Ubicación</h2>
          <div id="detail-map"></div>
        </div>
      </div>

      <aside class="side">
        <div class="box">
          <h3>Informes de este campo</h3>
          ${relacionados.length
            ? `<ul>${relacionados.map(r => `<li><a href="informe.html?id=${encodeURIComponent(r.id)}">${esc(r.titulo)}<small>${esc(r.tipo || '')} · ${esc(fechaCorta(r.fecha))}</small></a></li>`).join('')}</ul>`
            : '<p style="margin:0">Todavía no hay informes cargados para este campo.</p>'}
        </div>
        ${mail ? `<div class="box"><h3>Consultas</h3><p>Escribinos por este campo y te respondemos con la información completa.</p><a class="btn btn-primary" href="${mail}">Enviar un mail</a></div>` : ''}
      </aside>
    </div>`;

  const main = $('gal-main'), thumbs = $('thumbs');
  if (thumbs) {
    thumbs.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      main.style.backgroundImage = `url('${imgs[Number(b.dataset.i)]}')`;
      thumbs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
  }

  const { map } = createBaseMap('detail-map');
  const center = [Number(c.lat), Number(c.lng)];
  let drew = false;
  if (c.poligono) {
    try {
      const gj = L.geoJSON(JSON.parse(c.poligono), { style: { color: '#c9a24d', weight: 3, fillColor: '#c9a24d', fillOpacity: 0.18 } }).addTo(map);
      map.fitBounds(gj.getBounds().pad(0.4));
      drew = true;
    } catch (e) { console.warn('Polígono inválido en', c.id, e); }
  }
  if (!drew) map.setView(center, 13);
  L.marker(center, { icon: pinIcon(c.estado) }).addTo(map);
})();
