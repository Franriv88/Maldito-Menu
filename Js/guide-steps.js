// Pasos del instructivo (Js/guide.js). Las imágenes están en img/guide/{id}-{n}-{dark|light}.webp
// (capturas reales de la app). Si cambia algo de la pantalla, actualizar el texto y la captura.
const GUIDE_IMG_VERSION = 1;

const GUIDE_STEPS = {
    editor: () => [
        {
            img: 'img/guide/editor-1',
            title: 'Así funciona el editor',
            html: `<p>A la <b>izquierda</b> está tu menú, tal como lo van a ver tus clientes: escribís directamente sobre él.</p>
                   <p>A la <b>derecha</b>, en <b>Diseño</b>, elegís cómo se ve: logo, tipografías, colores, idiomas y el pie del menú. En el celular o la tablet, se abre con el botón <b>Diseño</b> de arriba.</p>
                   <p>Seguí estos pasos y en unos minutos lo tenés listo.</p>`,
        },
        {
            img: 'img/guide/editor-2',
            title: 'Cargá tus productos',
            html: `<ul>
                     <li>Escribí el <b>nombre</b> y el <b>precio</b>. Si dejás el precio vacío, el producto se publica sin precio.</li>
                     <li>La <b>descripción</b> es opcional. Si empezás una línea con «- » se arma una lista.</li>
                     <li><b>+ Agregar</b> suma otro producto debajo.</li>
                     <li>La <b>X</b> roja de la derecha borra el producto.</li>
                   </ul>`,
        },
        {
            img: 'img/guide/editor-3',
            title: 'Títulos y secciones',
            html: `<p>El menú se arma en <b>secciones</b>: cada una tiene una foto y uno o más <b>títulos</b> (por ejemplo «Cafés» y «Bebidas frías») con sus productos.</p>
                   <ul>
                     <li>Tocá un título para cambiarlo.</li>
                     <li><b>Agregar nuevo título y sus productos</b> suma otro dentro de la misma sección.</li>
                     <li>Con las <b>flechas</b> subís o bajás la sección completa; el <b>tacho</b> la elimina.</li>
                     <li>Al final del menú, <b>Agregar sección</b> crea una nueva.</li>
                   </ul>`,
        },
        {
            img: 'img/guide/editor-4',
            title: 'La foto de cada sección',
            html: `<p>Hacé clic en la foto para subir una (o arrastrala desde tu computadora). Después podés <b>arrastrarla</b> para encuadrarla o usar los controles:</p>
                   <ul>
                     <li><b>Mover</b> a los costados o arriba y abajo, <b>zoom</b>, <b>alto</b> y <b>ancho</b> del recuadro.</li>
                     <li><b>Voltear</b>, <b>Quitar fondo</b> (deja solo el producto) y <b>Centrar</b> para volver al encuadre original.</li>
                   </ul>
                   <span class="gd-tip">Las fotos con buena luz y fondo simple son las que mejor quedan.</span>`,
        },
        {
            img: 'img/guide/editor-5',
            title: 'Elegí el diseño de cada sección',
            html: `<p>El botón <b>Diseño</b> de cada sección te deja elegir qué va de cada lado: texto e imagen, la imagen a la izquierda o a la derecha, dos columnas de texto o una imagen a lo ancho (según tu plan).</p>
                   <p>Las flechas <b>⇄</b> intercambian los lados.</p>`,
        },
        {
            img: 'img/guide/editor-6',
            title: 'Encabezado: tu nombre o tu logo',
            html: `<p>En <b>Diseño → Encabezado</b> elegís qué se ve arriba del menú:</p>
                   <ul>
                     <li><b>Un título</b>: el nombre de tu local, escrito con la tipografía de los títulos.</li>
                     <li><b>Tu logo</b>: arrastrá la imagen ahí mismo y ajustá el tamaño y la opacidad.</li>
                   </ul>
                   <span class="gd-tip">Un PNG con fondo transparente queda mejor. Si tu logo tiene fondo, probá «Quitar fondo».</span>`,
        },
        {
            img: 'img/guide/editor-7',
            title: 'Tipografías y colores',
            html: `<ul>
                     <li><b>Tipografías</b>: la letra de los títulos y la de los productos, sus tamaños, negrita y cursiva.</li>
                     <li><b>Colores y fondos</b>: el color de los títulos, de los textos, del fondo del menú y de los costados. También podés poner una imagen de fondo.</li>
                   </ul>
                   <p>Cada cambio se ve al instante a la izquierda y <b>se guarda solo</b>.</p>`,
        },
        {
            img: 'img/guide/editor-8',
            title: 'Precios, idiomas y pie del menú',
            html: `<ul>
                     <li><b>Precios e idiomas</b>: publicá el menú sin precios si querés, y elegí en qué idiomas se puede ver. Escribís en español y se traduce solo.</li>
                     <li><b>Pie del menú</b>: un aviso, la dirección del local y tus redes sociales (Instagram, WhatsApp y más).</li>
                   </ul>
                   <p>Cada grupo muestra un resumen cuando está cerrado, así ves de un vistazo cómo quedó.</p>`,
        },
        {
            img: 'img/guide/editor-9',
            title: 'Guardá y mirá cómo quedó',
            html: `<p>Los productos y los títulos se guardan con <b>Guardar menú</b> (abajo a la derecha). El diseño se guarda solo.</p>
                   <p>Después tocá <b>Ver menú</b>, arriba, para verlo como tus clientes.</p>
                   <span class="gd-tip">Podés volver a ver este instructivo cuando quieras con el botón «Instructivo», abajo a la derecha.</span>`,
        },
    ],

    pedidos: catering => {
        const mesa = catering ? 'cliente' : 'mesa';
        const c = catering ? 'c' : '';   // capturas de la versión catering
        const steps = [
            {
                img: `img/guide/pedidos-1${c}`,
                title: 'Los pedidos llegan a esta pantalla',
                html: catering
                    ? `<p>Cada cliente tiene su <b>link</b> o <b>QR</b>. Lo abre, elige del menú y te hace el pedido, que aparece acá al instante (con sonido).</p>
                       <p>Dejá esta pantalla abierta en una computadora, tablet o celular.</p>`
                    : `<p>Tus clientes escanean el <b>QR</b> de su mesa (o acercan el celular al <b>sticker NFC</b>), eligen del menú y piden. El pedido aparece acá al instante, con sonido.</p>
                       <p>Dejá esta pantalla abierta en la caja, la cocina o una tablet.</p>`,
            },
            {
                img: `img/guide/pedidos-2${c}`,
                title: 'Aceptá, prepará y entregá',
                html: `<ul>
                         <li><b>Nuevos</b>: revisá el pedido y tocá <b>Aceptar y enviar a ${catering ? 'preparación' : 'cocina'}</b> (o <b>Rechazar</b>).</li>
                         <li><b>En cocina</b>: cuando está hecho, tocá <b>Listo</b>.</li>
                         <li><b>Listos para entregar</b>: al entregarlo, tocá <b>Entregado</b>.</li>
                       </ul>
                       <p>Abajo ves los entregados y rechazados del día, con la hora y el nombre del cliente.</p>
                       <span class="gd-tip">Los navegadores bloquean el sonido hasta que tocás la página: tocá «activar el sonido» arriba.</span>`,
            },
        ];
        if (!catering) steps.push({
            img: 'img/guide/pedidos-3',
            title: 'Mesas abiertas',
            html: `<p>Si activás <b>Mesa abierta</b> en Configuración, arriba ves tus mesas.</p>
                   <ul>
                     <li>La mesa se <b>abre</b> sola cuando aceptás su primer pedido (o tocándola). Mientras está abierta, sus pedidos van directo a cocina sin tener que aceptar cada uno.</li>
                     <li>Al cobrar, tocala de nuevo para <b>cerrarla</b>. Si nadie pide en 6 horas, se cierra sola.</li>
                   </ul>`,
        });
        steps.push(
            {
                img: 'img/guide/pedidos-4',
                title: 'Configuración: encendé los pedidos',
                html: `<p>En la pestaña <b>Configuración</b>, el interruptor de arriba prende o apaga los pedidos.</p>
                       <p>Elegí el <b>tipo de negocio</b>:</p>
                       <ul>
                         <li><b>Restaurante</b>: los comensales piden desde la mesa.</li>
                         <li><b>Catering</b>: cada cliente o empresa tiene su link y te hace pedidos a distancia.</li>
                       </ul>`,
            },
            {
                img: 'img/guide/pedidos-5',
                title: 'Ajustá cómo funcionan',
                html: `<p>Cada grupo se abre con un clic y muestra un resumen cuando está cerrado:</p>
                       <ul>
                         <li><b>Cómo se aceptan los pedidos</b>: ${catering ? 'los confirmás vos o pasan directo a preparación' : 'los acepta el mozo o van directo a cocina si el cliente está en el local'}.</li>
                         <li><b>Impresión en cocina</b>: la impresora de tickets (comandera).</li>
                         <li><b>Límite y pausa</b>: máximo de pedidos por día o semana, o pausar los pedidos hasta una fecha.</li>
                       </ul>
                       <p>Cuando cambiás algo aparece abajo la barra <b>Guardar cambios</b>.</p>`,
            },
            {
                img: `img/guide/pedidos-6${c}`,
                title: catering ? 'Cargá tus clientes' : 'Creá tus mesas',
                html: catering
                    ? `<p>En la pestaña <b>Clientes, QR y links</b> tocá <b>Agregar cliente</b> (o <b>Agregar varios…</b>).</p>
                       <p>Tocá el nombre para cambiarlo: por ejemplo «Agencia AGP». Los pedidos llegan como «Pedido de Agencia AGP», con el nombre de quien lo hizo.</p>`
                    : `<p>En la pestaña <b>Mesas, QR y NFC</b> tocá <b>Agregar mesa</b> (o <b>Agregar varias…</b> para crear muchas de una vez).</p>
                       <p>Tocá el nombre de una mesa para cambiarlo: por ejemplo «Terraza 2» o «Barra».</p>`,
            },
            {
                img: `img/guide/pedidos-7${c}`,
                title: catering ? 'Compartí el link o el QR' : 'Imprimí los QR',
                html: catering
                    ? `<ul>
                         <li><b>Link</b> copia el link del cliente para mandárselo por WhatsApp o mail.</li>
                         <li><b>Imprimir</b> saca su QR en papel.</li>
                         <li><b>Probar</b> abre el menú tal como lo ve tu cliente.</li>
                       </ul>`
                    : `<ul>
                         <li><b>Imprimir todos</b> arma una hoja A4 con un sticker por mesa: recortás y pegás.</li>
                         <li>También podés imprimir una sola mesa con su botón <b>Imprimir</b>.</li>
                         <li><b>Probar</b> abre el menú tal como lo ve el comensal de esa mesa.</li>
                       </ul>
                       <span class="gd-tip">Si también vas a pegar stickers NFC, marcá «Con el logo de NFC en el centro del QR».</span>`,
            },
        );
        if (!catering) steps.push({
            img: 'img/guide/pedidos-8',
            title: 'Stickers NFC (opcional)',
            html: `<p>Con un sticker NFC, el comensal solo acerca el celular a la mesa y se abre el menú, sin escanear.</p>
                   <ul>
                     <li>Comprá stickers <b>NTAG213</b> o <b>NTAG215</b>.</li>
                     <li>Tocá <b>Grabarlos con el celular</b>, escaneá ese QR con un Android y grabá cada sticker siguiendo los pasos.</li>
                   </ul>
                   <span class="gd-tip">El QR impreso y el sticker NFC llevan al mismo link: podés usar uno, el otro o los dos.</span>`,
        });
        steps.push({
            img: `img/guide/pedidos-9${c}`,
            title: '¡Listo para recibir pedidos!',
            html: `<p>Hacé una prueba: abrí el link de una ${mesa} con <b>Probar</b>, hacé un pedido y miralo llegar a esta pantalla.</p>
                   <span class="gd-tip">Podés volver a ver este instructivo cuando quieras con el botón «Instructivo», abajo a la derecha.</span>`,
        });
        return steps;
    },
};
