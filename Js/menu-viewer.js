// menu-viewers.js

// NOTA: La variable 'db' (instancia de Firestore) debe estar disponible globalmente,
// inicializada en tu archivo firebase-config.js que DEBE cargarse ANTES que este script
// en tu index.html.

document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');

    // Comprobar si db está definida. Si no, algo salió mal con firebase-config.js
    if (typeof db === 'undefined' || db === null) {
        console.error("Error: La instancia de Firestore (db) no está disponible. Asegúrate de que firebase-config.js se carga correctamente y antes de menu-viewers.js.");
        menuContainer.innerHTML = '<p>Lo sentimos, hubo un problema al cargar la configuración del menú. Por favor, inténtalo de nuevo más tarde.</p>';
        return;
    }

    // *** INICIO de la LÓGICA DE FIRESTORE EN TIEMPO REAL ***
    // Escucha cambios en la colección 'productos' de Firestore
    // Ordena por categoría para facilitar el agrupamiento y renderizado
    db.collection('productos').orderBy('categoria', 'asc').onSnapshot(snapshot => {
        // --- CONSOLE.LOG DE DEPURACIÓN INICIO ---
        console.log("menu-viewers.js: onSnapshot activado.");
        console.log("menu-viewers.js: Snapshot vacío?", snapshot.empty);
        if (!snapshot.empty) {
            console.log("menu-viewers.js: Número de documentos en el snapshot:", snapshot.size);
        }
        // --- CONSOLE.LOG DE DEPURACIÓN FIN ---

        const productos = [];
        snapshot.forEach(doc => {
            productos.push({ id: doc.id, ...doc.data() }); // 'id' del documento y todos sus datos
        });

        // --- CONSOLE.LOG DE DEPURACIÓN INICIO ---
        console.log("menu-viewers.js: Array 'productos' después de forEach:", productos);
        // --- CONSOLE.LOG DE DEPURACIÓN FIN ---


        // Si no hay productos, mostrar un mensaje
        if (productos.length === 0) {
            menuContainer.innerHTML = '<p>El menú no está disponible en este momento.</p>';
            return;
        }

        // Limpiar el contenido actual del menú antes de redibujar con los datos actualizados
        menuContainer.innerHTML = '';

        // Agrupar productos por su campo 'categoria'
        const menuCategorizado = {};
        productos.forEach(item => {
            if (!menuCategorizado[item.categoria]) {
                menuCategorizado[item.categoria] = [];
            }
            menuCategorizado[item.categoria].push(item);
        });

        // --- CONSOLE.LOG DE DEPURACIÓN INICIO ---
        console.log("menu-viewers.js: Objeto 'menuCategorizado':", menuCategorizado);
        // --- CONSOLE.LOG DE DEPURACIÓN FIN ---


        // --- RENDERIZADO DEL MENÚ DINÁMICO ---
        // Este es el mismo código que tenías, adaptado para usar los datos de Firestore

        // SECCIÓN 1: CAFÉ DE ESPECIALIDAD (Texto a la izquierda, Imagen a la derecha)
        const cafeEspecialidad = menuCategorizado['CAFÉ DE ESPECIALIDAD'];
        if (cafeEspecialidad && cafeEspecialidad.length > 0) {
            console.log("menu-viewers.js: Renderizando sección CAFÉ DE ESPECIALIDAD."); // Depuración
            let seccionHTML = `
                <div class="menu-section">
                    <div class="menu-content">
                        <h2>CAFÉ DE ESPECIALIDAD</h2>`;

            cafeEspecialidad.forEach(item => {
                // Usar la descripción del item de Firestore, si existe; sino, una por defecto
                const descripcion = item.descripcion || "El clásico de la casa.";

                seccionHTML += `
                    <div class="menu-item" data-producto="${item.nombre}" data-categoria="CAFÉ DE ESPECIALIDAD">
                        <div class="item-header">
                            <span class="producto">${item.nombre}</span>
                            <span class="precio">$${item.precio}</span>
                        </div>
                        <div class="item-details">
                            <p>${descripcion}</p>
                        </div>
                    </div>
                `;
            });

            seccionHTML += `
                    </div>
                    <div class="menu-image">
                        <img src="./img/img/coffee.png" alt="Taza de café">
                    </div>
                </div>`;
            menuContainer.innerHTML += seccionHTML;
        } else {
            console.log("menu-viewers.js: No hay productos para CAFÉ DE ESPECIALIDAD o la categoría no coincide."); // Depuración
        }


        // SECCIÓN 2: CAFÉ FRÍO (Imagen a la izquierda, Texto a la derecha)
        const cafeFrio = menuCategorizado['CAFÉ FRÍO'];
        if (cafeFrio && cafeFrio.length > 0) {
            console.log("menu-viewers.js: Renderizando sección CAFÉ FRÍO."); // Depuración
            let seccionHTML = `
                <div class="menu-section layout-reversed">
                    <div class="menu-content">
                        <h2>CAFÉ FRÍO</h2>`;

            cafeFrio.forEach(item => {
                // Usar la descripción del item de Firestore, si existe; sino, una por defecto
                const descripcion = item.descripcion || "Disfruta de la frescura en cada sorbo.";

                seccionHTML += `
                    <div class="menu-item" data-producto="${item.nombre}" data-categoria="CAFÉ FRÍO">
                        <div class="item-header">
                            <span class="producto">${item.nombre}</span>
                            <span class="precio">$${item.precio}</span>
                        </div>
                        <div class="item-details">
                            <p>${descripcion}</p>
                        </div>
                    </div>
                `;
            });

            seccionHTML += `
                    </div>
                    <div class="menu-image">
                        <img src="./img/img/croissant.png" alt="Café frío y croissant">
                    </div>
                </div>`;
            menuContainer.innerHTML += seccionHTML;
        } else {
            console.log("menu-viewers.js: No hay productos para CAFÉ FRÍO o la categoría no coincide."); // Depuración
        }


        // --- FIN del Renderizado del Menú Dinámico ---

    }, (error) => {
        // Manejo de errores durante la escucha de Firestore
        console.error("Error al escuchar cambios en Firestore:", error);
        menuContainer.innerHTML = '<p>Lo sentimos, no pudimos cargar el menú. Inténtalo de nuevo más tarde.</p>';
    });
    // *** FIN de la LÓGICA DE FIRESTORE EN TIEMPO REAL ***


    // *** INICIO de la LÓGICA DE INTERACTIVIDAD (Acordeón y Analytics) ***
    // Esto se adjunta una sola vez al cargar la página
    if (!menuContainer.dataset.listenerAttached) { // Previene adjuntar el listener múltiples veces
        menuContainer.addEventListener('click', (evento) => {
            const menuItem = evento.target.closest('.menu-item');

            if (menuItem) {
                // Lógica para mostrar/ocultar los detalles (el acordeón)
                const details = menuItem.querySelector('.item-details');
                if (details) { // Asegurarse de que el elemento existe
                    details.classList.toggle('visible');
                }

                // Lógica para enviar el evento a Analytics
                const producto = menuItem.dataset.producto;
                const categoria = menuItem.dataset.categoria;

                console.log(`Enviando evento: ${producto} en ${categoria}`);

                // Se asegura de que la función gtag exista antes de llamarla
                if (typeof gtag === 'function') {
                    gtag('event', 'view_item_details', {
                        'item_name': producto,
                        'item_category': categoria
                    });
                }
            }
        });
        menuContainer.dataset.listenerAttached = true; // Marca que el listener ya fue adjuntado
    }
    // *** FIN de la LÓGICA DE INTERACTIVIDAD ***

});
