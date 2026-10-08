(async function () {
  const $ = id => document.getElementById(id);
  let site, campos = [];
  try {
    const [s, c] = await Promise.all([loadJSON('data/site.json'), loadJSON('data/campos.json')]);
    site = s; campos = (c.campos || []).filter(visible);
  } catch (err) {
    $('list').innerHTML = `<div class="empty">No se pudieron cargar los datos.<br><small>${esc(err.message)}</small></div>`;
    return;
  }
  renderChrome(site, 'campos');

  const uniq = key => [...new Set(campos.map(c => c[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  uniq('estado').forEach(v => $('f-estado').insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
  uniq('provincia').forEach(v => $('f-prov').insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
  uniq('uso').forEach(v => $('f-uso').insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));

  const { map } = createBaseMap('map', { fullscreenTarget: $('map-wrap') });
  map.setView([-34.5, -60.5], 6);
  let layer = null;

  function readFilters() {
    const range = $('f-ha').value;
    const [min, max] = range ? range.split('-').map(Number) : [null, null];
    return { estado: $('f-estado').value, prov: $('f-prov').value, uso: $('f-uso').value, min, max, q: $('f-q').value.trim().toLowerCase() };
  }

  function matches(c, f) {
    const ha = Number(c.superficie_ha) || 0;
    if (f.estado && c.estado !== f.estado) return false;
    if (f.prov && c.provincia !== f.prov) return false;
    if (f.uso && c.uso !== f.uso) return false;
    if (f.min !== null && (ha < f.min || ha >= f.max)) return false;
    if (f.q && ![c.titulo, c.localidad, c.partido, c.provincia].join(' ').toLowerCase().includes(f.q)) return false;
    return true;
  }

  const orden = { 'En venta': 0, 'Reservado': 1, 'En cartera': 2 };

  function highlight(id, scroll = true) {
    document.querySelectorAll('.card.active').forEach(el => el.classList.remove('active'));
    const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (card) { card.classList.add('active'); if (scroll) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  function apply(fit = true) {
    const f = readFilters();
    const list = campos.filter(c => matches(c, f)).sort((a, b) =>
      (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || String(b.fecha || '').localeCompare(String(a.fecha || '')));
    if (layer) map.removeLayer(layer.cluster);
    layer = addCampoMarkers(map, list, { onClick: c => highlight(c.id) });
    $('count').textContent = `${list.length} ${list.length === 1 ? 'campo' : 'campos'}`;
    $('list').innerHTML = list.length ? list.map(c => campoCardHTML(c)).join('') : '<div class="empty">No hay campos con esos filtros.</div>';
    if (fit && layer.bounds.length) map.fitBounds(L.latLngBounds(layer.bounds).pad(0.25), { maxZoom: 11 });
  }

  $('list').addEventListener('click', e => {
    const btn = e.target.closest('.btn-map');
    if (!btn || !layer) return;
    const m = layer.markers.get(btn.dataset.id);
    if (!m) return;
    highlight(btn.dataset.id, false);
    layer.cluster.zoomToShowLayer(m, () => m.openPopup());
    $('map-wrap').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  ['f-estado', 'f-prov', 'f-uso', 'f-ha'].forEach(id => $(id).addEventListener('change', () => apply()));
  $('f-q').addEventListener('input', () => apply());
  $('f-reset').addEventListener('click', () => {
    ['f-estado', 'f-prov', 'f-uso', 'f-ha', 'f-q'].forEach(id => { $(id).value = ''; });
    apply();
  });
  apply();
})();
