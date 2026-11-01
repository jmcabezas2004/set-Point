# Generador de publicaciones · ADTM Don Benito

App web (sin instalación) para crear los carteles de partido y de resultado de los cuatro equipos del club, en formato Instagram 1080 × 1350.

- **Divisiones y colores**: División de Honor (fondo blanco, cabecera azul oscuro), 1ª Nacional (azul oscuro), 3ª División y Regional (azul claro). En 3ª y Regional se pone el logo de la FEXTM en lugar del de la RFETM.
- **Escudo del rival**: se sube en JPG o PNG y el fondo se quita solo (con control de sensibilidad). Se puede descargar el PNG sin fondo y guardar el rival para la próxima vez.
- **Resultado**: marcador, foto de los equipos (se puede arrastrar y hacer zoom) y nombres.
- **Exportar**: botón «Descargar PNG» y, en el móvil, «Compartir / Guardar en Fotos».

## Logos
Están en `assets/`, recortados de carteles anteriores. Para máxima calidad se pueden sustituir por los originales en PNG transparente manteniendo el mismo nombre de archivo:
`donbenito.png`, `rfetm.png`, `fextm.png`, `extremadura.png`, `ayuntamiento.png` y `sponsors.png` (bloque de patrocinadores).

## Uso
Abrir `adtm/index.html` desde un servidor (por ejemplo GitHub Pages: `https://<usuario>.github.io/<repo>/adtm/`).
