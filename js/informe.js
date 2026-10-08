(async function () {
  const $ = id => document.getElementById(id);
  const root = $('detail');
  const id = new URLSearchParams(location.search).get('id');

  let site, informes = [], campos = [];
  try {
    const [s, c, i] = await Promise.all([loadJSON('data/site.json'), loadJSON('data/campos.json'), loadJSON('data/informes.json')]);
    site = s; campos = c.campos || []; informes = i.informes || [];
  } catch (err) {
    root.innerHTML = `<div class="empty">No se pudieron cargar los datos.<br><small>${esc(err.message)}</small></div>`;
    return;
  }
  renderChrome(site, 'informes');

  const r = informes.find(x => x.id === id);
  if (!r) {
    root.innerHTML = '<div class="empty"><h2>No encontramos ese informe</h2><p><a href="informes.html">Volver a la biblioteca</a></p></div>';
    return;
  }
  document.title = `${r.titulo} · ${site.nombre}`;

  const campo = r.campo_id ? campos.find(c => c.id === r.campo_id) : null;
  /* cada archivo puede estar en el repositorio (archivo) o en otro lado, como Drive (url) */
  const archivos = (r.archivos || []).filter(a => a && (a.archivo || a.url));
  const imgs = (r.imagenes || []).filter(Boolean);
  const otros = informes.filter(x => x.id !== r.id && ((campo && x.campo_id === campo.id) || x.tipo === r.tipo))
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))).slice(0, 4);

  const meta = [
    r.fecha ? `<span><b>${esc(fechaLarga(r.fecha))}</b></span>` : '',
    r.version ? `<span>Versión <b>${esc(r.version)}</b></span>` : '',
    r.cliente ? `<span>Cliente: <b>${esc(r.cliente)}</b></span>` : '',
    campo ? `<span>Campo: <b><a href="campo.html?id=${encodeURIComponent(campo.id)}">${esc(campo.titulo)}</a></b></span>` : (r.lugar ? `<span>Lugar: <b>${esc(r.lugar)}</b></span>` : ''),
    r.campana ? `<span>Campaña: <b>${esc(r.campana)}</b></span>` : '',
    (r.lotes || []).length ? `<span>Lotes: <b>${esc(r.lotes.join(', '))}</b></span>` : '',
    (r.autores || []).length ? `<span>Autores: <b>${esc(r.autores.join(', '))}</b></span>` : ''
  ].filter(Boolean).join('');

  /* cifras clave: los 3 a 5 números que resumen el informe (tira bajo el resumen) */
  const cifras = (r.cifras_clave || []).filter(c => c && c.valor);
  const cifrasHTML = cifras.length ? `<div class="cifras">${cifras.map(c =>
    `<div class="cifra"><b>${esc(c.valor)}</b><span>${esc(c.etiqueta || '')}</span></div>`).join('')}</div>` : '';

  /* superficie por ambiente: barra apilada y tabla con porcentajes */
  const amb = (r.ambientes || []).filter(a => a && a.nombre && Number(a.hectareas) > 0);
  const ambTotal = amb.reduce((s, a) => s + Number(a.hectareas), 0);
  const ambHTML = amb.length ? `<h2>Superficie por ambiente</h2>
    <div class="amb-bar" role="img" aria-label="Distribución de la superficie por ambiente">
      ${amb.map((a, i) => `<i style="width:${Number(a.hectareas) / ambTotal * 100}%;background:${ambienteColor(a, i, amb.length)}" title="${esc(a.nombre)}"></i>`).join('')}
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Ambiente</th><th class="num">ha</th><th class="num">%</th></tr></thead>
      <tbody>${amb.map((a, i) => `<tr><td><span class="sw" style="background:${ambienteColor(a, i, amb.length)}"></span>${esc(a.nombre)}</td><td class="num">${numAR(a.hectareas, 2)}</td><td class="num">${numAR(Number(a.hectareas) / ambTotal * 100, 1)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${numAR(ambTotal, 2)}</td><td class="num">100</td></tr></tfoot>
    </table></div>` : '';

  /* prescripción: producto y dosis por ambiente */
  const pr = r.prescripcion || {};
  const dosis = (pr.dosis || []).filter(d => d && (d.producto || d.dosis || d.ambiente));
  const hayProducto = dosis.some(d => d.producto);
  const entrega = (pr.entrega || []).filter(Boolean);
  const prHTML = (dosis.length || pr.cultivo || entrega.length || pr.total_insumo || pr.observaciones) ? `<h2>Prescripción</h2>
    <div class="facts-grid">
      ${pr.cultivo ? `<div class="fact"><span>Cultivo</span><b>${esc(pr.cultivo)}</b></div>` : ''}
      ${entrega.length ? `<div class="fact"><span>Formato de entrega</span><b>${esc(entrega.join(' · '))}</b></div>` : ''}
      ${pr.total_insumo ? `<div class="fact"><span>Total de insumo</span><b>${esc(pr.total_insumo)}</b></div>` : ''}
    </div>
    ${dosis.length ? `<div class="tbl-wrap"><table class="tbl">
      <thead><tr>${hayProducto ? '<th>Producto</th>' : ''}<th>Ambiente</th><th class="num">Dosis</th><th class="num">ha</th></tr></thead>
      <tbody>${dosis.map(d => {
        const col = AMB_COLORES[String(d.ambiente || '').trim().toLowerCase().replace(/^ambiente\s+/, '')];
        return `<tr>${hayProducto ? `<td>${esc(d.producto || '')}</td>` : ''}<td>${col ? `<span class="sw" style="background:${col}"></span>` : ''}${esc(d.ambiente || '')}</td><td class="num">${esc(d.dosis || '')}</td><td class="num">${d.hectareas ? numAR(d.hectareas, 2) : ''}</td></tr>`;
      }).join('')}</tbody>
    </table></div>` : ''}
    ${pr.observaciones ? `<p class="sat-note">${esc(pr.observaciones)}</p>` : ''}` : '';

  root.innerHTML = `
    <div class="crumbs"><a href="informes.html">← Todos los informes</a></div>
    ${r.ejemplo ? '<div class="notice"><b>Informe de ejemplo.</b> El contenido es inventado para probar el sitio. Borralo desde el panel cuando cargues informes reales.</div>' : ''}
    <div class="detail-head" style="align-items:flex-start;flex-direction:column;gap:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag">${esc(r.tipo || 'Informe')}</span>${r.estado ? `<span class="tag ${informeEstadoClase(r.estado)}">${esc(r.estado)}</span>` : ''}${(r.etiquetas || []).map(t => `<span class="tag" style="font-weight:500;letter-spacing:.06em;text-transform:none">${esc(t)}</span>`).join('')}</div>
      <h1>${esc(r.titulo)}</h1>
      <div class="meta-line" style="margin:0">${meta}</div>
    </div>
    <div class="detail-grid">
      <div class="desc" style="min-width:0">
        ${r.resumen ? `<p class="lead-text">${esc(r.resumen)}</p>` : ''}
        ${cifrasHTML}
        ${ambHTML}
        ${prHTML}
        ${r.contenido ? mdLite(r.contenido) : ''}
        ${imgs.length ? `<h2>Imágenes</h2><div class="gal-grid">${imgs.map(s => `<a href="${esc(s)}" target="_blank" rel="noopener"><img src="${esc(s)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
      </div>
      <aside class="side">
        ${archivos.length || r.enlace ? `<div class="box"><h3>Archivos</h3>
          <ul class="files" style="border-top:none">
            ${archivos.map(a => {
              const href = a.archivo || a.url;
              const ext = a.archivo ? (a.archivo.split('.').pop() || '').slice(0, 5) : 'Enlace';
              return `<li><a href="${esc(href)}" target="_blank" rel="noopener"><div>${esc(a.titulo || String(href).split('/').pop())}</div><span>${esc(ext)}</span></a></li>`;
            }).join('')}
            ${r.enlace ? `<li><a href="${esc(r.enlace)}" target="_blank" rel="noopener"><div>Abrir enlace del informe</div><span>Web</span></a></li>` : ''}
          </ul></div>` : ''}
        ${campo ? `<div class="box"><h3>Campo asociado</h3>
          <p><b>${esc(campo.titulo)}</b><br>${esc(ubicacionTexto(campo))} · ${esc(haTexto(campo))}</p>
          <a class="btn btn-ghost" href="campo.html?id=${encodeURIComponent(campo.id)}">Ver ficha del campo</a></div>` : ''}
        ${otros.length ? `<div class="box"><h3>Relacionados</h3><ul>${otros.map(o =>
          `<li><a href="informe.html?id=${encodeURIComponent(o.id)}">${esc(o.titulo)}<small>${esc(o.tipo || '')} · ${esc(fechaCorta(o.fecha))}</small></a></li>`).join('')}</ul></div>` : ''}
      </aside>
    </div>`;
})();
