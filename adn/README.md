# Extractor de ADN de marca

App web que, a partir del **enlace de una web** y/o **capturas de pantalla del feed de Instagram**, genera la ficha «ADN de marca»:

`=== ADN … ===` · IDENTIDAD · IDENTIDAD VISUAL · PROPUESTA DE VALOR · TONO DE COMUNICACIÓN · ARGUMENTOS CLAVE · SERVICIOS · INSTRUCCIONES DE DISEÑO PARA IA · FIRMA CORPORATIVA · `=== FIN ADN ===`

## Arrancarla en local (gratis)
Necesitas [Node.js](https://nodejs.org) 18 o superior (sin instalar nada más).

- **Windows**: doble clic en `adn/iniciar-windows.bat`
- **Mac**: doble clic en `adn/iniciar-mac.command` (la primera vez: clic derecho → Abrir)
- **Terminal**: `node adn/server.js` y abre http://localhost:8080/adn/

El servidor local descarga las webs desde tu ordenador, así la app puede leer cualquier web sin bloqueos.
También funciona publicada (GitHub Pages), pero entonces depende de proxys públicos gratuitos para leer webs, que a veces fallan.

## Modos
1. **Local (gratis)** – todo en tu navegador, sin IA de pago:
   - De la web: nombre, descriptor, zona, años, email, teléfono, Instagram, URL del logo, colores HEX reales (CSS, variables de Elementor/tema, logo), tipografías (Google Fonts, CSS), servicios (menú y páginas de servicios) y textos de la marca.
   - De las capturas: paleta de colores dominante y, con OCR (Tesseract, en el navegador), el texto de la bio y captions: nombre, teléfono, web, tono.
   - Propuesta de valor, tono, argumentos, estilo e instrucciones de diseño se redactan con reglas a partir de lo encontrado. Lo que no aparece queda como `[completar]`.
2. **Prompt para Claude.ai (gratis)** – hace lo anterior y prepara un prompt con el borrador y los textos de la web. Pégalo en claude.ai (con tu plan normal), adjunta las capturas y Claude redacta la ficha final. Después puedes pegarla en la app con «Pegar resultado de Claude» para guardarla en el historial.
3. **API de Claude (de pago)** – automático con tu API key.

Resultado: muestras de color, copiar, descargar `.txt`, editar y historial guardado en el navegador.
