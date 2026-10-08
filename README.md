# SLV · Consultoría agropecuaria: sitio de trabajo del equipo

Sitio estático (HTML, CSS y JavaScript, sin servidor) para que los tres socios carguen y consulten **informes, prescripciones y campos**. El repositorio de GitHub es la base de datos: cada cambio queda guardado con su historial.

## Qué se puede cargar

| Sección | Para qué | Dónde se edita |
|---|---|---|
| **Informes y prescripciones** | Ambientaciones, prescripciones de siembra y fertilización, evaluaciones de compra, análisis satelitales, informes a medida. Cada uno con resumen, texto, imágenes, archivos (PDF, KMZ, shapefile, planillas) y, si corresponde, un campo asociado. | Panel → Contenido → Informes y prescripciones |
| **Campos** | Campos en venta y campos en cartera, con mapa, fotos, datos y un bloque opcional de informe satelital. | Panel → Contenido → Campos |
| **Datos del sitio** | Nombre, descriptor, mail, textos de la portada, áreas de trabajo, equipo. | Panel → Contenido → Datos del sitio |

El campo **Estado** de cada campo define cómo se muestra: *En venta* (con precio), *En cartera* (campo de un cliente sobre el que trabajamos, no está a la venta), *Reservado*, *Vendido* (desaparece del mapa pero queda guardado).

Los textos admiten un formato mínimo: `## Título de sección`, listas con `- ` al inicio del renglón, `**negrita**`, una línea en blanco separa párrafos y **tablas**:

```
| Lote | ha |
|---|---|
| Lote 1 | 53,0 |
| Lote 2 | 38,4 |
```

## Guía de carga: qué tipo de informe usar y qué completar

Cada informe tiene los mismos datos básicos (título, tipo, estado, versión, fecha, campo asociado, cliente, autores, etiquetas, archivos). Lo que cambia según el tipo es qué bloques opcionales conviene completar:

| Tipo | Es… | Completar además |
|---|---|---|
| **Ambientación** | Zonificación de lotes por NDVI y otras capas | *Cifras clave*, *Superficie por ambiente* (barra y tabla), lotes, campaña, mapa como imagen |
| **Informe de establecimiento** | Caracterización o informe técnico de un campo: superficie total y útil, lotes, suelos, relieve, plan de trabajo | *Cifras clave*, *Superficie por ambiente*, tabla de ambientes por lote en el *Contenido*; estado **En seguimiento** si hay monitoreo mensual |
| **Evaluación de campo** | Dossier para comprar o vender: lo publicado frente a lo medido, normativa, puntos a verificar | *Cifras clave* (ha publicadas, ha medidas, índice de productividad), tabla publicado/medido en el *Contenido* |
| **Prescripción** | Dosis por ambiente para la máquina (siembra, fertilización, micronutrientes) | Bloque *Prescripción*: cultivo, una fila por producto y ambiente, total de insumo, formato (KMZ, shapefile, ISOXML); adjuntar los archivos |
| **Análisis de suelo** | Resultados de laboratorio | *Cifras clave* y tabla en el *Contenido*; adjuntar la planilla original |
| **Análisis satelital** | Un análisis puntual (agua, anegamiento, vigor) | *Cifras clave*, imágenes |
| **Informe a medida** | Cualquier tema que pida el cliente | Lo que haga falta; el *Lugar* si no hay campo asociado |
| **Referencia externa** | Material de terceros (INTA, papers) guardado para consulta | Fuente y por qué sirve; no se presenta como trabajo propio |

**Estado del informe:** *Borrador* → *En revisión* → *Entregado*; *En seguimiento* para trabajos que siguen abiertos.

**Campo asociado o lugar.** Si el establecimiento ya está cargado en *Campos* (aunque no esté a la venta, queda como *En cartera*), se asocia el informe y se hereda ubicación y superficie. Si todavía no, se escribe el *Lugar* a mano.

**Archivos pesados.** Los PDF y KMZ de hasta unos 25 MB se suben directo. Si un archivo es más grande (ortomosaicos, shapefiles con imágenes), conviene dejarlo en Drive y pegar el *Enlace* en la fila del archivo.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Portada: áreas de trabajo, informes recientes, mapa, equipo |
| `informes.html`, `informe.html` | Biblioteca con filtros y ficha de cada informe |
| `campos.html`, `campo.html` | Mapa con filtros y ficha de cada campo |
| `data/informes.json`, `data/campos.json`, `data/site.json` | **Los datos** (los edita el panel) |
| `images/campos/`, `informes/` | Fotos y archivos que sube el panel |
| `admin/` | Panel de edición (Sveltia CMS); `admin/config.yml` define los formularios |
| `css/`, `js/` | Diseño y lógica |

## Probarlo en la compu

```bash
python -m http.server 8077
```

Abrí http://localhost:8077 (no funciona con doble clic: el navegador bloquea la lectura de los `.json`). El panel también corre en local: http://localhost:8077/admin/ → **Trabajar con un repositorio local** (Chrome o Edge) y elegir esta carpeta.

## Publicarlo

1. Repositorio en GitHub: `luismercier01-lab/Proyectos-SLV` (ya configurado en `admin/config.yml`).
2. Subir el contenido de esta carpeta (*Add file → Upload files*, con las carpetas y el archivo `.nojekyll`).
3. *Settings → Pages* → Source = *Deploy from a branch*, Branch = `main`, carpeta `/ (root)`.

Sitio: `https://luismercier01-lab.github.io/Proyectos-SLV/` · Panel: `.../admin/`.

## Sumar a los otros socios

1. Cada uno crea su cuenta de GitHub.
2. En el repo: *Settings → Collaborators → Add people*; aceptan la invitación por mail.
3. Cada uno entra al panel → **Iniciar sesión con un token de acceso**. El panel abre GitHub con el permiso `repo` marcado (token **clásico**: los "fine-grained" no funcionan en un repo personal ajeno). Se copia el token, se pega en el panel y queda guardado en ese navegador. **Es como una contraseña: no se comparte.** Conviene ponerle vencimiento.

## Privacidad: leer antes de cargar datos de clientes

- Con un repositorio **público**, tanto los archivos como el sitio son visibles para cualquiera que tenga el enlace. Las páginas llevan `noindex` y hay un `robots.txt`, lo que evita que Google las muestre, pero **no es protección**.
- GitHub Pages publica el sitio en internet aunque el repositorio sea privado (salvo en planes Enterprise).
- Para trabajar con **informes y datos de clientes**, la opción recomendada es: repositorio **privado** + publicación en **Cloudflare Pages** (gratis, funciona con repos privados) + **Cloudflare Access** (gratis hasta 50 usuarios) para que solo entren los tres mails del equipo. El panel sigue funcionando igual con el token.
- Mientras tanto, no cargues contactos de dueños, precios reservados ni informes de clientes en un repo público.

## Notas técnicas

- Si dos personas guardan el mismo archivo al mismo tiempo, el segundo recibe un error: recargar el panel y repetir.
- Cada archivo que se sube a GitHub por el panel debería pesar menos de ~25 MB (PDF e imágenes comprimidas); GitHub rechaza archivos de más de 100 MB y el repositorio completo conviene mantenerlo por debajo de 1 GB. Para lo pesado, usar el campo *Enlace* de los archivos.
- Los mapas usan teselas gratuitas (OpenStreetMap y Esri). Para mucho tráfico o uso comercial conviene un proveedor con cuenta propia (Mapbox, MapTiler, Google): se cambia en `js/common.js`, bloque `TILES`.
- Datos satelitales de los informes: Copernicus Sentinel-2 (libres, citando la fuente).
- La relación "campo asociado" de los informes usa el campo `id` de cada campo; si se cambia un `id`, hay que actualizarlo en los informes que lo usan.
