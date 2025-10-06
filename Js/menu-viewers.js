// menu-viewers.js (Versión Final y Definitiva con Orden Correcto)

document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');

    if (typeof db === 'undefined' || db === null) {
        console.error("Error: La instancia de Firestore (db) no está disponible.");
        menuContainer.innerHTML = '<p>Error al cargar la configuración del menú.</p>';
        return;
    }

    const seccionesConfig = {
        "CAFÉ DE ESPECIALIDAD": { layout: 'normal', imagen: './img/img/coffee.png' },
        "CAFÉ FRÍO":          { layout: 'normal' },
        "BEBIDAS":            { layout: 'reversed', imagen: './img/img/tea.png' },
        "EXTRAS":             { layout: 'reversed'},
        "SALADOS":            { layout: 'normal', imagen: './img/img/croissant.png'},
        "LAMINADOS":          { layout: 'normal'},
        "DULCES":             { layout: 'reversed', imagen: './img/img/cookie.png'}
    };

    db.collection('productos').orderBy('orden', 'asc').orderBy('ordenProducto', 'asc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            menuContainer.innerHTML = '<p>El menú no está disponible en este momento.</p>';
            return;
        }

        // --- LÓGICA DE AGRUPACIÓN CORREGIDA ---
        const menuCategorizado = {};
        const categoriasOrdenadas = []; // Array para mantener el orden correcto de las categorías

        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            
            // Si es una categoría nueva, la agregamos a nuestro array ordenado
            if (!menuCategorizado[item.categoria]) {
                menuCategorizado[item.categoria] = [];
                categoriasOrdenadas.push(item.categoria);
            }
            menuCategorizado[item.categoria].push(item);
        });
        // --- FIN DE LA LÓGICA CORREGIDA ---

        menuContainer.innerHTML = '';

        // --- RENDERIZADO AUTOMÁTICO Y ORDENADO ---
        // Recorremos el array ORDENADO (categoriasOrdenadas), no el objeto desordenado.
        categoriasOrdenadas.forEach(categoria => {
            const itemsDeCategoria = menuCategorizado[categoria];
            const config = seccionesConfig[categoria] || { layout: 'normal' };
            const layoutClass = config.layout === 'reversed' ? 'layout-reversed' : '';

            let seccionHTML = `
                <div class="menu-section ${layoutClass}">
                    <div class="menu-content">
                        <h2>${categoria}</h2>`;

            // El orden de los productos dentro de 'itemsDeCategoria' ya es correcto
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

            seccionHTML += `</div>`; // Cierre de .menu-content

            if (config.imagen) {
                seccionHTML += `
                    <div class="menu-image">
                        <img src="${config.imagen}" alt="${categoria}">
                    </div>`;
            }
            seccionHTML += `</div>`; // Cierre de .menu-section
            
            menuContainer.innerHTML += seccionHTML;
        });

    }, (error) => {
        console.error("Error al escuchar cambios en Firestore:", error);
        // Este error puede ser por el índice. Revisa las instrucciones anteriores.
    });


    // --- LÓGICA DE INTERACTIVIDAD (SIN CAMBIOS) ---
    if (!menuContainer.dataset.listenerAttached) {
        menuContainer.addEventListener('click', (evento) => {
            const menuItem = evento.target.closest('.menu-item');
            if (menuItem) {
                const details = menuItem.querySelector('.item-details');
                if (details) details.classList.toggle('visible');
            }
        });
        menuContainer.dataset.listenerAttached = true;
    }
});