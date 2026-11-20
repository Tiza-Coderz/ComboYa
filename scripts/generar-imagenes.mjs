/**
 * Genera las imágenes WebP de la demo (productos, combos, banners, Open Graph e
 * iconos de la PWA) a partir de ilustraciones SVG. Así el repo no depende de
 * fotos con derechos de autor y las imágenes pesan ~10 KB.
 *
 * Uso: pnpm imagenes   → escribe en public/ (las rutas coinciden con el seed SQL)
 *
 * En un cliente real se reemplazan por fotos subidas desde el panel /admin.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const RAIZ = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(RAIZ, "public");
const CATALOGO = path.join(PUBLIC, "catalogo");
const FUENTE = "Segoe UI, Helvetica Neue, Arial, sans-serif";

const COLORES = {
  combos: ["#0f4c75", "#d5e8f4"],
  carnicos: ["#b42318", "#fde3e1"],
  granos: ["#a15c07", "#fdf0d5"],
  aseo: ["#0e7490", "#d6f3f8"],
  bebidas: ["#6d28d9", "#ebe4fd"],
  dulces: ["#be185d", "#fde2ef"],
};

// ─── Iconos (dibujados en una caja de 400×400 centrada) ────────────────────
const ICONOS = {
  regalo: (c) => `
    <rect x="70" y="170" width="260" height="190" rx="18" fill="${c}"/>
    <rect x="50" y="120" width="300" height="70" rx="16" fill="${c}" opacity=".85"/>
    <rect x="180" y="120" width="40" height="240" fill="#fff" opacity=".9"/>
    <ellipse cx="160" cy="105" rx="55" ry="30" fill="none" stroke="${c}" stroke-width="22" transform="rotate(-20 160 105)"/>
    <ellipse cx="240" cy="105" rx="55" ry="30" fill="none" stroke="${c}" stroke-width="22" transform="rotate(20 240 105)"/>`,
  caja: (c) => `
    <path d="M60 150 L200 90 L340 150 L340 320 L200 380 L60 320 Z" fill="${c}"/>
    <path d="M60 150 L200 210 L340 150" fill="none" stroke="#fff" stroke-width="10" opacity=".7"/>
    <path d="M200 210 L200 380" stroke="#fff" stroke-width="10" opacity=".7"/>
    <path d="M130 120 L270 180" stroke="#fff" stroke-width="18" opacity=".45"/>`,
  carne: (c) => `
    <ellipse cx="225" cy="170" rx="125" ry="105" fill="${c}" transform="rotate(-35 225 170)"/>
    <ellipse cx="215" cy="160" rx="70" ry="55" fill="#fff" opacity=".18" transform="rotate(-35 215 160)"/>
    <rect x="95" y="250" width="40" height="95" rx="16" fill="#f4ede4" transform="rotate(40 115 297)"/>
    <circle cx="70" cy="335" r="28" fill="#f4ede4"/><circle cx="105" cy="365" r="28" fill="#f4ede4"/>`,
  embutido: (c) => `
    <rect x="70" y="150" width="270" height="110" rx="55" fill="${c}" transform="rotate(-18 205 205)"/>
    <rect x="70" y="230" width="270" height="110" rx="55" fill="${c}" opacity=".75" transform="rotate(-18 205 285)"/>
    <circle cx="150" cy="200" r="10" fill="#fff" opacity=".5"/><circle cx="240" cy="175" r="10" fill="#fff" opacity=".5"/>
    <circle cx="190" cy="290" r="10" fill="#fff" opacity=".5"/>`,
  saco: (c) => `
    <path d="M110 110 Q200 70 290 110 L320 330 Q200 380 80 330 Z" fill="${c}"/>
    <path d="M120 110 Q200 140 280 110" fill="none" stroke="#fff" stroke-width="10" opacity=".6"/>
    <rect x="130" y="190" width="140" height="90" rx="12" fill="#fff" opacity=".9"/>
    <circle cx="200" cy="235" r="26" fill="${c}" opacity=".8"/>`,
  botella: (c) => `
    <rect x="170" y="60" width="60" height="40" rx="8" fill="${c}" opacity=".7"/>
    <path d="M175 100 L225 100 L230 150 Q290 175 290 230 L290 350 Q290 375 265 375 L135 375 Q110 375 110 350 L110 230 Q110 175 170 150 Z" fill="${c}"/>
    <rect x="130" y="240" width="140" height="80" rx="10" fill="#fff" opacity=".9"/>
    <rect x="150" y="270" width="100" height="18" rx="9" fill="${c}" opacity=".6"/>`,
  lata: (c) => `
    <rect x="80" y="110" width="110" height="230" rx="22" fill="${c}"/>
    <rect x="210" y="110" width="110" height="230" rx="22" fill="${c}" opacity=".8"/>
    <rect x="80" y="110" width="110" height="26" rx="10" fill="#fff" opacity=".45"/>
    <rect x="210" y="110" width="110" height="26" rx="10" fill="#fff" opacity=".45"/>
    <rect x="100" y="200" width="70" height="60" rx="8" fill="#fff" opacity=".85"/>
    <rect x="230" y="200" width="70" height="60" rx="8" fill="#fff" opacity=".85"/>`,
  jabon: (c) => `
    <rect x="70" y="170" width="260" height="150" rx="60" fill="${c}"/>
    <rect x="110" y="205" width="180" height="40" rx="20" fill="#fff" opacity=".35"/>
    <circle cx="120" cy="120" r="30" fill="${c}" opacity=".35"/><circle cx="175" cy="90" r="20" fill="${c}" opacity=".3"/>
    <circle cx="290" cy="125" r="24" fill="${c}" opacity=".3"/>`,
  rollo: (c) => `
    <rect x="90" y="120" width="220" height="220" rx="26" fill="${c}"/>
    <ellipse cx="200" cy="120" rx="110" ry="38" fill="#fff"/>
    <ellipse cx="200" cy="120" rx="34" ry="12" fill="${c}" opacity=".7"/>
    <path d="M310 230 L360 230 L360 340 L310 340" fill="#fff" opacity=".9"/>`,
  dulce: (c) => `
    <ellipse cx="200" cy="215" rx="95" ry="75" fill="${c}"/>
    <path d="M110 215 L45 160 L60 215 L45 270 Z" fill="${c}" opacity=".75"/>
    <path d="M290 215 L355 160 L340 215 L355 270 Z" fill="${c}" opacity=".75"/>
    <path d="M150 180 Q200 150 250 180" fill="none" stroke="#fff" stroke-width="14" opacity=".5"/>`,
  galleta: (c) => `
    <circle cx="200" cy="215" r="135" fill="${c}"/>
    <circle cx="200" cy="215" r="105" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="4 18" opacity=".7"/>
    <circle cx="160" cy="180" r="9" fill="#fff" opacity=".7"/><circle cx="240" cy="190" r="9" fill="#fff" opacity=".7"/>
    <circle cx="200" cy="250" r="9" fill="#fff" opacity=".7"/>`,
  taza: (c) => `
    <path d="M90 150 L290 150 L270 330 Q265 360 235 360 L145 360 Q115 360 110 330 Z" fill="${c}"/>
    <path d="M290 190 Q350 190 345 245 Q340 295 280 290" fill="none" stroke="${c}" stroke-width="22"/>
    <path d="M160 70 Q140 100 165 125 M210 60 Q190 95 215 125" fill="none" stroke="${c}" stroke-width="10" opacity=".5" stroke-linecap="round"/>`,
};

function iconoPara(slug, categoria) {
  if (categoria === "combos") return slug.includes("aseo") ? "caja" : "regalo";
  const reglas = [
    [/cerveza|malta/, "lata"],
    [/cafe|chocolate/, "taza"],
    [/ron|aceite|cloro|champu|lavaplatos|nectar|agua|refresco|desodorante/, "botella"],
    [/salchicha|chorizo|jamon|lomo/, "embutido"],
    [/pollo|muslos|cerdo|picadillo/, "carne"],
    [/papel/, "rollo"],
    [/jabon|detergente|pasta-dental/, "jabon"],
    [/galleta|turron/, "galleta"],
    [/caramelo|guayaba|dulce|flan/, "dulce"],
  ];
  for (const [re, icono] of reglas) if (re.test(slug)) return icono;
  return "saco";
}

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function partirTexto(texto, max) {
  const palabras = texto.split(" ");
  const lineas = [""];
  for (const p of palabras) {
    const actual = lineas[lineas.length - 1];
    if ((actual + " " + p).trim().length > max && actual) lineas.push(p);
    else lineas[lineas.length - 1] = (actual + " " + p).trim();
  }
  return lineas.slice(0, 2);
}

function svgProducto({ nombre, unidad, slug, categoria }) {
  const [color, fondo] = COLORES[categoria];
  const icono = ICONOS[iconoPara(slug, categoria)](color);
  const lineas = partirTexto(nombre, 20);
  const yTexto = lineas.length === 1 ? 640 : 615;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${fondo}"/><stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="680" cy="110" r="150" fill="${color}" opacity=".07"/>
  <circle cx="90" cy="560" r="110" fill="${color}" opacity=".06"/>
  <ellipse cx="400" cy="520" rx="210" ry="26" fill="#000" opacity=".06"/>
  <g transform="translate(200 120)">${icono}</g>
  ${lineas
    .map(
      (l, i) =>
        `<text x="400" y="${yTexto + i * 58}" text-anchor="middle" font-family="${FUENTE}" font-size="50" font-weight="700" fill="#0f172a">${esc(l)}</text>`,
    )
    .join("")}
  <text x="400" y="${yTexto + lineas.length * 58 + 6}" text-anchor="middle" font-family="${FUENTE}" font-size="32" fill="#475569">${esc(unidad)}</text>
</svg>`;
}

function svgBanner(variante) {
  const acentos = { familia: "#f59e0b", mega: "#34d399", cumpleanos: "#f472b6" };
  const a = acentos[variante];
  const iconos = {
    familia: ["regalo", "saco", "botella"],
    mega: ["caja", "saco", "carne"],
    cumpleanos: ["lata", "dulce", "regalo"],
  }[variante];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="640" viewBox="0 0 1600 640">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0a2f48"/><stop offset=".6" stop-color="#0f4c75"/><stop offset="1" stop-color="#1b5d8e"/>
  </linearGradient></defs>
  <rect width="1600" height="640" fill="url(#g)"/>
  <circle cx="1350" cy="80" r="260" fill="${a}" opacity=".18"/>
  <circle cx="1500" cy="600" r="200" fill="#fff" opacity=".06"/>
  <circle cx="980" cy="560" r="120" fill="${a}" opacity=".12"/>
  <g transform="translate(900 180) scale(.75)">${ICONOS[iconos[0]]("#ffffff")}</g>
  <g transform="translate(1140 110) scale(.95)">${ICONOS[iconos[1]](a)}</g>
  <g transform="translate(1250 330) scale(.6)">${ICONOS[iconos[2]]("#d5e8f4")}</g>
</svg>`;
}

function svgIcono(tam, maskable = false) {
  const pad = maskable ? tam * 0.2 : tam * 0.08;
  const r = maskable ? 0 : tam * 0.22;
  const s = (tam - pad * 2) / 400;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}">
  <rect width="${tam}" height="${tam}" rx="${r}" fill="#0f4c75"/>
  <g transform="translate(${pad} ${pad + tam * 0.02}) scale(${s})">${ICONOS.regalo("#ffffff").replace(/fill="#fff" opacity=".9"/, 'fill="#f59e0b"')}</g>
</svg>`;
}

function svgOg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0a2f48"/><stop offset="1" stop-color="#1b5d8e"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1050" cy="90" r="220" fill="#f59e0b" opacity=".18"/>
  <g transform="translate(780 170) scale(.85)">${ICONOS.regalo("#ffffff")}</g>
  <text x="80" y="260" font-family="${FUENTE}" font-size="96" font-weight="800" fill="#fff">ComboYa</text>
  <text x="80" y="340" font-family="${FUENTE}" font-size="40" fill="#d5e8f4">Combos para su familia en La Habana</text>
  <text x="80" y="420" font-family="${FUENTE}" font-size="32" fill="#f59e0b" font-weight="700">Entrega en 24–72 horas · Pague desde el exterior</text>
</svg>`;
}

// Mismo catálogo que supabase/migrations/…_seed_demo.sql (slug → nombre, unidad).
const PRODUCTOS = [
  ["carnicos", "pollo-troceado-10lb", "Pollo troceado", "caja 10 lb"],
  ["carnicos", "muslos-pollo-5lb", "Muslos de pollo", "bolsa 5 lb"],
  ["carnicos", "picadillo-pollo-1kg", "Picadillo de pollo", "paquete 1 kg"],
  ["carnicos", "salchichas-pollo-1kg", "Salchichas de pollo", "paquete 1 kg"],
  ["carnicos", "jamon-pierna-1kg", "Jamón de pierna", "pieza 1 kg"],
  ["carnicos", "masas-cerdo-2kg", "Masas de cerdo", "bolsa 2 kg"],
  ["carnicos", "chorizo-500g", "Chorizo", "paquete 500 g"],
  ["carnicos", "lomo-ahumado-1kg", "Lomo ahumado", "pieza 1 kg"],
  ["granos", "arroz-10lb", "Arroz", "saco 10 lb"],
  ["granos", "frijoles-negros-1kg", "Frijoles negros", "paquete 1 kg"],
  ["granos", "frijoles-colorados-1kg", "Frijoles colorados", "paquete 1 kg"],
  ["granos", "chicharos-1kg", "Chícharos", "paquete 1 kg"],
  ["granos", "azucar-2kg", "Azúcar blanca", "paquete 2 kg"],
  ["granos", "aceite-girasol-1l", "Aceite de girasol", "botella 1 L"],
  ["granos", "espaguetis-500g", "Espaguetis", "paquete 500 g"],
  ["granos", "leche-polvo-1kg", "Leche en polvo", "bolsa 1 kg"],
  ["aseo", "detergente-polvo-1kg", "Detergente en polvo", "bolsa 1 kg"],
  ["aseo", "jabon-bano-3u", "Jabón de baño", "paquete 3 u"],
  ["aseo", "champu-400ml", "Champú", "frasco 400 ml"],
  ["aseo", "pasta-dental-3u", "Pasta dental", "paquete 3 u"],
  ["aseo", "papel-higienico-4u", "Papel higiénico", "paquete 4 rollos"],
  ["aseo", "desodorante-roll-on", "Desodorante roll-on", "frasco 50 ml"],
  ["aseo", "cloro-1l", "Cloro", "botella 1 L"],
  ["aseo", "lavaplatos-750ml", "Lavaplatos líquido", "frasco 750 ml"],
  ["bebidas", "cerveza-cristal-24", "Cerveza Cristal", "caja 24 latas"],
  ["bebidas", "cerveza-bucanero-24", "Cerveza Bucanero", "caja 24 latas"],
  ["bebidas", "malta-24", "Malta", "caja 24 latas"],
  ["bebidas", "refresco-cola-1-5l", "Refresco de cola", "botella 1.5 L"],
  ["bebidas", "ron-havana-club-3", "Ron Havana Club 3 Años", "botella 700 ml"],
  ["bebidas", "agua-mineral-6u", "Agua mineral", "paquete 6 × 1.5 L"],
  ["bebidas", "nectar-mango-1l", "Néctar de mango", "caja 1 L"],
  ["bebidas", "cafe-serrano-250g", "Café molido Serrano", "paquete 250 g"],
  ["dulces", "galletas-maria", "Galletas María", "paquete 200 g"],
  ["dulces", "barra-guayaba-600g", "Barra de guayaba", "barra 600 g"],
  ["dulces", "chocolate-polvo-400g", "Chocolate en polvo", "lata 400 g"],
  ["dulces", "turron-mani-6u", "Turrón de maní", "paquete 6 u"],
  ["dulces", "galletas-soda", "Galletas de soda", "paquete 300 g"],
  ["dulces", "caramelos-surtidos", "Caramelos surtidos", "bolsa 500 g"],
  ["dulces", "dulce-leche-450g", "Dulce de leche", "pomo 450 g"],
  ["dulces", "flan-polvo-4u", "Flan en polvo", "caja 4 sobres"],
];

const COMBOS = [
  ["combo-familiar-basico", "Combo Familiar Básico", "9 productos"],
  ["combo-carnico", "Combo Cárnico", "6 productos"],
  ["combo-aseo-completo", "Combo Aseo Completo", "10 productos"],
  ["combo-cumpleanos", "Combo Cumpleaños", "9 productos"],
  ["combo-desayuno", "Combo Desayuno", "8 productos"],
  ["combo-abuelos", "Combo Abuelos", "12 productos"],
  ["combo-fin-de-semana", "Combo Fin de Semana", "5 productos"],
  ["combo-mega-mensual", "Combo Mega Mensual", "23 productos"],
];

async function webp(svg, destino, ancho, calidad = 74) {
  await mkdir(path.dirname(destino), { recursive: true });
  await sharp(Buffer.from(svg)).resize({ width: ancho }).webp({ quality: calidad }).toFile(destino);
}

async function png(svg, destino) {
  await mkdir(path.dirname(destino), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(destino);
}

async function main() {
  const tareas = [];
  for (const [categoria, slug, nombre, unidad] of PRODUCTOS) {
    tareas.push(
      webp(
        svgProducto({ nombre, unidad, slug, categoria }),
        path.join(CATALOGO, "productos", `${slug}.webp`),
        640,
      ),
    );
  }
  for (const [slug, nombre, unidad] of COMBOS) {
    tareas.push(
      webp(
        svgProducto({ nombre, unidad, slug, categoria: "combos" }),
        path.join(CATALOGO, "combos", `${slug}.webp`),
        640,
      ),
    );
  }
  for (const v of ["familia", "mega", "cumpleanos"]) {
    tareas.push(webp(svgBanner(v), path.join(CATALOGO, "banners", `banner-${v}.webp`), 1600, 70));
  }
  tareas.push(webp(svgOg(), path.join(PUBLIC, "og-default.webp"), 1200, 80));
  tareas.push(png(svgOg(), path.join(RAIZ, "src", "app", "opengraph-image.png")));
  tareas.push(png(svgIcono(192), path.join(PUBLIC, "icons", "icon-192.png")));
  tareas.push(png(svgIcono(512), path.join(PUBLIC, "icons", "icon-512.png")));
  tareas.push(png(svgIcono(512, true), path.join(PUBLIC, "icons", "icon-maskable-512.png")));
  tareas.push(png(svgIcono(180), path.join(RAIZ, "src", "app", "apple-icon.png")));
  tareas.push(png(svgIcono(64), path.join(RAIZ, "src", "app", "icon.png")));
  await Promise.all(tareas);
  console.log(`✓ ${tareas.length} imágenes generadas en public/ y src/app/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
