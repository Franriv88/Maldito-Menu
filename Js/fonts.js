// Js/fonts.js — Catálogo único de tipografías (editor y menú público).
// - El editor arma los selectores de "Fuente de títulos" y "Fuente de cuerpo" con FONT_GROUPS
//   y carga todas las de Google Fonts para poder previsualizarlas.
// - El menú público carga SOLO las fuentes que usa el restaurante (loadMenuFonts).
// El valor guardado en config/styles (fontFamily / titleFontFamily) es el "css" de cada fuente.
// premium: grupo del beneficio "extra_fonts" (Tipografías premium) del plan.

const FONT_GROUPS = [
    { label: 'Modernas', fonts: [
        { name: 'Roboto',            css: "'Roboto', sans-serif",            google: 'Roboto:ital,wght@0,400;0,700;1,400' },
        { name: 'Montserrat',        css: "'Montserrat', sans-serif",        google: 'Montserrat:ital,wght@0,400;0,700;1,400' },
        { name: 'Poppins',           css: "'Poppins', sans-serif",           google: 'Poppins:ital,wght@0,400;0,700;1,400' },
        { name: 'Lato',              css: "'Lato', sans-serif",              google: 'Lato:ital,wght@0,400;0,700;1,400' },
        { name: 'Josefin Sans',      css: "'Josefin Sans', sans-serif",      google: 'Josefin+Sans:ital,wght@0,400;0,700;1,400' },
        { name: 'Quicksand',         css: "'Quicksand', sans-serif",         google: 'Quicksand:wght@400;700' },
        { name: 'Oswald',            css: "'Oswald', sans-serif",            google: 'Oswald:wght@400;600' },
        { name: 'Raleway',           css: "'Raleway', sans-serif",           google: 'Raleway:ital,wght@0,300;0,400;0,600;1,400' },
        { name: 'Bebas Neue',        css: "'Bebas Neue', sans-serif",        google: 'Bebas+Neue' },
        { name: 'Sans-serif (sistema)', css: 'sans-serif' },
        { name: 'Arial',             css: "'Arial', sans-serif" },
        { name: 'Verdana',           css: 'Verdana, sans-serif' },
        { name: 'Trebuchet MS',      css: "'Trebuchet MS', sans-serif" },
    ] },
    { label: 'Clásicas', fonts: [
        { name: 'Playfair Display',  css: "'Playfair Display', serif",       google: 'Playfair+Display:ital,wght@0,400;0,700;1,400' },
        { name: 'Cormorant Garamond', css: "'Cormorant Garamond', serif",    google: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,700;1,300;1,400' },
        { name: 'Cinzel',            css: "'Cinzel', serif",                 google: 'Cinzel:wght@400;700' },
        { name: 'Lora',              css: "'Lora', serif",                   google: 'Lora:ital,wght@0,400;0,700;1,400' },
        { name: 'Merriweather',      css: "'Merriweather', serif",           google: 'Merriweather:ital,wght@0,300;0,400;0,700;1,300' },
        { name: 'Libre Baskerville', css: "'Libre Baskerville', serif",      google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
        { name: 'Roboto Slab',       css: "'Roboto Slab', serif",            google: 'Roboto+Slab:wght@400;700' },
        { name: 'Yeseva One',        css: "'Yeseva One', serif",             google: 'Yeseva+One' },
        { name: 'Georgia',           css: 'Georgia, serif' },
        { name: 'Times New Roman',   css: "'Times New Roman', serif" },
    ] },
    { label: 'Caligráficas ✦', premium: true, fonts: [
        { name: 'Dancing Script',    css: "'Dancing Script', cursive",       google: 'Dancing+Script:wght@400;700' },
        { name: 'Great Vibes',       css: "'Great Vibes', cursive",          google: 'Great+Vibes' },
        { name: 'Pacifico',          css: "'Pacifico', cursive",             google: 'Pacifico' },
        { name: 'Lobster',           css: "'Lobster', cursive",              google: 'Lobster' },
        { name: 'Satisfy',           css: "'Satisfy', cursive",              google: 'Satisfy' },
        { name: 'Kaushan Script',    css: "'Kaushan Script', cursive",       google: 'Kaushan+Script' },
        { name: 'Sacramento',        css: "'Sacramento', cursive",           google: 'Sacramento' },
        { name: 'Parisienne',        css: "'Parisienne', cursive",           google: 'Parisienne' },
        { name: 'Abril Fatface',     css: "'Abril Fatface', cursive",        google: 'Abril+Fatface' },
        { name: 'UnifrakturMaguntia', css: "'UnifrakturMaguntia', cursive",  google: 'UnifrakturMaguntia' },
    ] },
    { label: 'Pizarra y bodegón ✦', premium: true, fonts: [
        { name: 'Amatic SC',         css: "'Amatic SC', cursive",            google: 'Amatic+SC:wght@400;700' },
        { name: 'Caveat',            css: "'Caveat', cursive",               google: 'Caveat:wght@400;700' },
        { name: 'Permanent Marker',  css: "'Permanent Marker', cursive",     google: 'Permanent+Marker' },
        { name: 'Fredericka the Great', css: "'Fredericka the Great', cursive", google: 'Fredericka+the+Great' },
        { name: 'Cabin Sketch',      css: "'Cabin Sketch', cursive",         google: 'Cabin+Sketch:wght@400;700' },
        { name: 'Special Elite',     css: "'Special Elite', cursive",        google: 'Special+Elite' },
        { name: 'Rye',               css: "'Rye', cursive",                  google: 'Rye' },
        { name: 'Alfa Slab One',     css: "'Alfa Slab One', serif",          google: 'Alfa+Slab+One' },
    ] },
    { label: 'Estilo asiático ✦', premium: true, fonts: [
        { name: 'Shojumaru',         css: "'Shojumaru', cursive",            google: 'Shojumaru' },
        { name: 'Potta One',         css: "'Potta One', cursive",            google: 'Potta+One' },
        { name: 'Reggae One',        css: "'Reggae One', cursive",           google: 'Reggae+One' },
        { name: 'Dela Gothic One',   css: "'Dela Gothic One', sans-serif",   google: 'Dela+Gothic+One' },
        { name: 'Yuji Syuku',        css: "'Yuji Syuku', serif",             google: 'Yuji+Syuku' },
        { name: 'Zen Antique',       css: "'Zen Antique', serif",            google: 'Zen+Antique' },
        { name: 'Kaisei Decol',      css: "'Kaisei Decol', serif",           google: 'Kaisei+Decol:wght@400;700' },
        { name: 'Noto Serif JP',     css: "'Noto Serif JP', serif",          google: 'Noto+Serif+JP:wght@400;700' },
    ] },
    { label: 'Monoespaciada', fonts: [
        { name: 'Courier New',       css: "'Courier New', monospace" },
    ] },
];

const ALL_FONTS = FONT_GROUPS.flatMap(g => g.fonts);

// Valores viejos guardados en config/styles → su nombre actual en Google Fonts
// ("Cormorant Garant" ya no existe en Google Fonts: es "Cormorant Garamond")
const FONT_ALIASES = { "'Cormorant Garant', serif": "'Cormorant Garamond', serif" };
const normalizeFontCss = css => FONT_ALIASES[css] || css;
const fontByCss = css => ALL_FONTS.find(f => f.css === normalizeFontCss(css)) || null;
const googleFontHref = f => f?.google ? `https://fonts.googleapis.com/css2?family=${f.google}&display=swap` : '';

// Una hoja de Google Fonts por fuente: si una falla, las demás se siguen viendo
function injectFontLink(font) {
    const href = googleFontHref(font);
    if (!href) return;
    const id = 'gf-' + font.google.split(':')[0];
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = href;
    link.dataset.menuFont = '1';
    document.head.appendChild(link);
}

// Menú público: solo las fuentes elegidas por el restaurante
function loadMenuFonts(...cssValues) {
    cssValues.map(fontByCss).forEach(injectFontLink);
}

// Editor: todas las fuentes (para previsualizar en los selectores)
function loadAllFonts() {
    ALL_FONTS.forEach(injectFontLink);
}

// <option>s agrupados; cada opción se ve con su propia tipografía
function fontOptionsHTML({ sameAsBody = false } = {}) {
    const opt = f => `<option value="${f.css.replace(/"/g, '&quot;')}" style="font-family:${f.css.replace(/"/g, '&quot;')}">${f.name}</option>`;
    return (sameAsBody ? '<option value="">Igual que el cuerpo</option>' : '')
        + FONT_GROUPS.map(g => `<optgroup label="${g.label}"${g.premium ? ' data-premium="extra_fonts"' : ''}>${g.fonts.map(opt).join('')}</optgroup>`).join('');
}
