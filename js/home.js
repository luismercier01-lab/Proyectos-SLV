(async function () {
  const $ = id => document.getElementById(id);

  let site, campos = [], informes = [];
  try {
    const [s, c, i] = await Promise.all([loadJSON('data/site.json'), loadJSON('data/campos.json'), loadJSON('data/informes.json')]);
    site = s; campos = (c.campos || []).filter(visible); informes = i.informes || [];
  } catch (err) {
    document.body.insertAdjacentHTML('afterbegin', `<div class="empty">No se pudieron cargar los datos.<br><small>${esc(err.message)}</small><br><small>Si abriste el archivo con doble clic, usá un servidor local (ver README).</small></div>`);
    return;
  }

  renderChrome(site, 'inicio');

  /* líneas de nivel decorativas */
  $('topo-lines').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const s = (1.02 - i * 0.078).toFixed(3), sy = (s * (1 - i * 0.012)).toFixed(3), r = i * 9 - 10;
    const dx = (i * 7).toFixed(0), dy = (-i * 5).toFixed(0);
    return `<use href="#blob" transform="translate(${300 + Number(dx)} ${270 + Number(dy)}) rotate(${r}) scale(${s} ${sy}) translate(-300 -270)" opacity="${(0.7 - i * 0.04).toFixed(2)}"/>`;
  }).join('');

  $('hero-title').textContent = site.hero_titulo || '';
  $('hero-text').textContent = site.hero_texto || '';

  $('areas-grid').innerHTML = (site.areas || []).map(a => `
    <div class="area"><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p></div>`).join('');

  const camposById = new Map((campos).map(c => [c.id, c]));
  const recientes = [...informes].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))).slice(0, 5);
  $('recent').innerHTML = recientes.length
    ? recientes.map(r => informeRowHTML(r, camposById)).join('')
    : '<div class="empty">Todavía no hay informes cargados.</div>';

  const { map } = createBaseMap('map');
  map.setView([-34.5, -60.5], 5);
  const { bounds } = addCampoMarkers(map, campos);
  if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 9 });

  $('equipo-texto').textContent = site.equipo_texto || '';
  $('team').innerHTML = (site.equipo || []).map(m => `
    <div class="member">
      <div class="av" ${m.foto ? `style="background-image:url('${esc(m.foto)}')"` : ''}>${m.foto ? '' : esc((m.nombre || '?').trim().charAt(0))}</div>
      <b>${esc(m.nombre)}</b><span>${esc(m.rol || '')}</span>
    </div>`).join('');
})();
