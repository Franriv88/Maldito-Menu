// menu-viewers.js

// NOTA: La variable 'db' (instancia de Firestore) debe estar disponible globalmente,
// inicializada en tu archivo firebase-config.js que DEBE cargarse ANTES que este script
// en tu index.html.

// menu-viewers.js (Versión Mejorada y Escalable)

// menu-viewers.js (Versión Mejorada y Escalable)

document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');

    // Comprueba si la conexión a Firestore (db) está disponible.
    if (typeof db === 'undefined' || db === null) {
        console.error("Error: La instancia de Firestore (db) no está disponible.");
        menuContainer.innerHTML = '<p>Lo sentimos, hubo un problema al cargar la configuración del menú.</p>';
        return;
    }

    // --- CONFIGURACIÓN DE SECCIONES ---
    // Define aquí el layout y la imagen para cada categoría.
    const seccionesConfig = {
        "CAFÉ DE ESPECIALIDAD": { layout: 'normal', imagen: './img/img/coffee.png' },
        "CAFÉ FRÍO":          { layout: 'normal' }, // No tendrá imagen
        "BEBIDAS":            { layout: 'reversed', imagen: './img/img/croissant.png' },
        // Para añadir una nueva sección en el futuro, solo tienes que agregar una línea aquí.
        // "SANDWICHES":      { layout: 'normal', imagen: './img/img/sandwich.png' }
    };

    // Escucha cambios en la colección 'productos' de Firestore en tiempo real.
    db.collection('productos').orderBy('orden', 'asc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            menuContainer.innerHTML = '<p>El menú no está disponible en este momento.</p>';
            return;
        }

        // Agrupa todos los productos de Firestore por su categoría.
        const menuCategorizado = {};
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!menuCategorizado[item.categoria]) {
                menuCategorizado[item.categoria] = [];
            }
            menuCategorizado[item.categoria].push(item);
        });

        // Limpia el menú actual para volver a dibujarlo con los datos actualizados.
        menuContainer.innerHTML = '';

        // --- RENDERIZADO AUTOMÁTICO DEL MENÚ ---
        // Este bucle recorre CADA categoría encontrada en la base de datos y la dibuja.
        for (const categoria in menuCategorizado) {
            const itemsDeCategoria = menuCategorizado[categoria];
            const config = seccionesConfig[categoria] || { layout: 'normal' }; // Configuración por defecto.
            const layoutClass = config.layout === 'reversed' ? 'layout-reversed' : '';

            // 1. Inicia la sección y la columna de contenido.
            let seccionHTML = `
                <div class="menu-section ${layoutClass}">
                    <div class="menu-content">
                        <h2>${categoria}</h2>`;

            // 2. Bucle interno: Añade TODOS los productos a la columna de contenido.
            itemsDeCategoria.forEach(item => {
                const descripcion = item.descripcion || "El clásico de la casa.";
                seccionHTML += `
                    <div class="menu-item" data-producto="${item.nombre}" data-categoria="${categoria}">
                        <div class="item-header">
                            <span class="producto">${item.nombre}</span>
                            <span class="precio">$${item.precio}</span>
                        </div>
                        <div class="item-details">
                            <p>${descripcion}</p>
                        </div>
                    </div>`;
            });

            // 3. Cierra la columna de contenido.
            seccionHTML += `
                    </div>`;

            // 4. Condición: SOLO si hay una imagen definida en la configuración, añade la columna de la imagen.
            if (config.imagen) {
                seccionHTML += `
                    <div class="menu-image">
                        <img src="${config.imagen}" alt="${categoria}">
                    </div>`;
            }

            // 5. Cierra la sección completa.
            seccionHTML += `
                </div>`;
            
            // 6. Añade todo el HTML de la sección al contenedor principal.
            menuContainer.innerHTML += seccionHTML;
        }

    }, (error) => {
        console.error("Error al escuchar cambios en Firestore:", error);
        menuContainer.innerHTML = '<p>Lo sentimos, no pudimos cargar el menú.</p>';
    });


    // *** LÓGICA DE INTERACTIVIDAD (Acordeón y Analytics) ***
    // Se adjunta una sola vez para evitar duplicados.
    if (!menuContainer.dataset.listenerAttached) {
        menuContainer.addEventListener('click', (evento) => {
            const menuItem = evento.target.closest('.menu-item');
            if (menuItem) {
                // Lógica para mostrar/ocultar los detalles (el acordeón).
                const details = menuItem.querySelector('.item-details');
                if (details) details.classList.toggle('visible');

                // Lógica para enviar el evento a Analytics.
                const producto = menuItem.dataset.producto;
                const categoria = menuItem.dataset.categoria;
                console.log(`Enviando evento: ${producto} en ${categoria}`);

                if (typeof gtag === 'function') {
                    gtag('event', 'view_item_details', {
                        'item_name': producto,
                        'item_category': categoria
                    });
                }
            }
        });
        menuContainer.dataset.listenerAttached = true;
    }
});

//Fácil de Mantener: Ahora, para agregar una nueva sección "Postres" en el futuro, solo tienes que:

//Añadir el <h2>Postres</h2> y la <table> en admin.html.

//Añadir una sola línea en seccionesConfig: "POSTRES": { layout: 'reversed', imagen: './img/img/postre.png' }.

//¡Y listo! No necesitarás tocar la lógica de renderizado nunca más.