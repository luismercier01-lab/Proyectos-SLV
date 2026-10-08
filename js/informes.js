(async function () {
  const $ = id => document.getElementById(id);
  let site, informes = [], campos = [];
  try {
    const [s, c, i] = await Promise.all([loadJSON('data/site.json'), loadJSON('data/campos.json'), loadJSON('data/informes.json')]);
    site = s; campos = c.campos || []; informes = i.informes || [];
  } catch (err) {
    $('list').innerHTML = `<div class="empty">No se pudieron cargar los datos.<br><small>${esc(err.message)}</small></div>`;
    return;
  }
  renderChrome(site, 'informes');

  const camposById = new Map(campos.map(c => [c.id, c]));
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  uniq(informes.map(r => r.tipo)).sort((a, b) => a.localeCompare(b, 'es'))
    .forEach(v => $('f-tipo').insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
  uniq(informes.map(r => r.estado))
    .forEach(v => $('f-estado').insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
  uniq(informes.map(r => String(r.fecha || '').slice(0, 4))).sort().reverse()
    .forEach(v => $('f-anio').insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
  uniq(informes.map(r => r.campo_id)).forEach(id => {
    const c = camposById.get(id);
    if (c) $('f-campo').insertAdjacentHTML('beforeend', `<option value="${esc(id)}">${esc(c.titulo)}</option>`);
  });

  function apply() {
    const tipo = $('f-tipo').value, estado = $('f-estado').value, anio = $('f-anio').value, campo = $('f-campo').value;
    const q = $('f-q').value.trim().toLowerCase();
    const list = informes.filter(r => {
      if (tipo && r.tipo !== tipo) return false;
      if (estado && r.estado !== estado) return false;
      if (anio && String(r.fecha || '').slice(0, 4) !== anio) return false;
      if (campo && r.campo_id !== campo) return false;
      if (q) {
        const c = camposById.get(r.campo_id);
        const hay = [r.titulo, r.resumen, r.cliente, r.lugar, r.campana, (r.lotes || []).join(' '), (r.autores || []).join(' '),
          (r.etiquetas || []).join(' '), c ? c.titulo : ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    $('count').textContent = `${list.length} ${list.length === 1 ? 'informe' : 'informes'}`;
    $('list').innerHTML = list.length
      ? `<div class="rep-list">${list.map(r => informeRowHTML(r, camposById)).join('')}</div>`
      : '<div class="empty">No hay informes con esos filtros.</div>';
  }

  ['f-tipo', 'f-estado', 'f-anio', 'f-campo'].forEach(id => $(id).addEventListener('change', apply));
  $('f-q').addEventListener('input', apply);
  $('f-reset').addEventListener('click', () => {
    ['f-tipo', 'f-estado', 'f-anio', 'f-campo', 'f-q'].forEach(id => { $(id).value = ''; });
    apply();
  });
  apply();
})();
