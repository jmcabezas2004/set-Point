# Extractor de ADN de marca

App web (sin instalación ni servidor propio) que, a partir del **enlace de una web** y/o **capturas de pantalla del feed de Instagram**, genera la ficha «ADN de marca» con el formato:

`=== ADN … ===` · IDENTIDAD · IDENTIDAD VISUAL · PROPUESTA DE VALOR · TONO DE COMUNICACIÓN · ARGUMENTOS CLAVE · SERVICIOS · INSTRUCCIONES DE DISEÑO PARA IA · FIRMA CORPORATIVA · `=== FIN ADN ===`

## Cómo funciona
- Usa la API de Claude (modelo `claude-opus-5-5`) directamente desde el navegador con tu propia API key (se guarda solo en tu navegador si marcas «Recordar»).
- Si pegas una web, Claude la lee con la herramienta `web_fetch` (inicio, servicios, contacto, CSS / Google Fonts) para sacar colores HEX, tipografías, logo y datos de contacto. También puede usar `web_search`.
- Las capturas se reducen en el navegador (máx. 1568 px) y se envían como imágenes para analizar colores, tipografía, estilo y tono de los captions.
- Los datos que no aparecen en las fuentes se marcan como `[completar]`; las notas que escribas tienen prioridad.
- Plantillas: **Detectar sector** (adapta cabecera y sección de servicios), **Inmobiliaria** (tu formato exacto) o **Cualquier marca**.
- Resultado: vista previa de colores, copiar, descargar `.txt`, editar a mano e historial local.

## Uso
Abrir `adn/index.html` desde un servidor (por ejemplo GitHub Pages: `https://<usuario>.github.io/<repo>/adn/`). Necesitas una API key de https://platform.claude.com/settings/keys.
