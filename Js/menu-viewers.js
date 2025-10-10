// menu-viewers.js (Versión Final con Demostración Repetida y Sutil)

document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');

    if (typeof db === 'undefined' || db === null) {
        console.error("Error: La instancia de Firestore (db) no está disponible.");
        menuContainer.innerHTML = '<p>Error al cargar la configuración del menú.</p>';
        return;
    }

    const seccionesConfig = {
        "CAFÉ DE ESPECIALIDAD": { layout: 'normal', grupo: 'cafes', imagen: './img/img/coffee.png' },
        "CAFÉ FRÍO":          { layout: 'normal', grupo: 'cafes' },
        "BEBIDAS":            { layout: 'reversed', grupo: 'bebidas_y_extras', imagen: './img/img/tea.png' },
        "EXTRAS":             { layout: 'reversed', grupo: 'bebidas_y_extras' },
        "SALADOS":            { layout: 'normal', grupo: 'salados_y_laminados', imagen: './img/img/croissant.png' },
        "LAMINADOS":          { layout: 'normal', grupo: 'salados_y_laminados' },
        "DULCES":             { layout: 'reversed', imagen: './img/img/cookie.png' }
    };

    db.collection('productos').orderBy('orden', 'asc').orderBy('ordenProducto', 'asc').onSnapshot(snapshot => {
        if (snapshot.empty) {
            menuContainer.innerHTML = '<p>El menú no está disponible.</p>';
            return;
        }

        const menuPorGrupo = {};
        const gruposOrdenados = [];
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            const config = seccionesConfig[item.categoria] || {};
            const grupoNombre = config.grupo || item.categoria;
            if (!menuPorGrupo[grupoNombre]) {
                menuPorGrupo[grupoNombre] = {};
                gruposOrdenados.push(grupoNombre);
            }
            if (!menuPorGrupo[grupoNombre][item.categoria]) {
                menuPorGrupo[grupoNombre][item.categoria] = [];
            }
            menuPorGrupo[grupoNombre][item.categoria].push(item);
        });
        
        menuContainer.innerHTML = '';

        gruposOrdenados.forEach(nombreGrupo => {
            const categoriasDelGrupo = menuPorGrupo[nombreGrupo];
            let configGrupo = Object.values(seccionesConfig).find(c => c.grupo === nombreGrupo && c.imagen) || Object.values(seccionesConfig).find(c => c.grupo === nombreGrupo) || seccionesConfig[nombreGrupo] || {};
            const layoutClass = configGrupo.layout === 'reversed' ? 'layout-reversed' : '';
            let seccionHTML = `<div class="menu-section ${layoutClass}"><div class="menu-content">`;
            for (const nombreCategoria in categoriasDelGrupo) {
                const itemsDeCategoria = categoriasDelGrupo[nombreCategoria];
                seccionHTML += `<h2>${nombreCategoria}</h2>`;
                itemsDeCategoria.forEach(item => {
                    const descripcion = item.descripcion || "El clásico de la casa.";
                    seccionHTML += `<div class="menu-item" data-producto="${item.nombre}" data-categoria="${nombreCategoria}"><div class="item-header"><span class="producto">${item.nombre}</span><span class="precio">$${item.precio}</span></div><div class="item-details"><p>${descripcion}</p></div></div>`;
                });
            }
            seccionHTML += `</div>`;
            if (configGrupo.imagen) {
                seccionHTML += `<div class="menu-image"><img src="${configGrupo.imagen}" alt="${nombreGrupo}"></div>`;
            }
            seccionHTML += `</div>`;
            menuContainer.innerHTML += seccionHTML;
        });

        // Llama a la nueva función de demostración
        iniciarDemostracionAcordeon();

    }, (error) => {
        console.error("Error al escuchar cambios en Firestore:", error);
    });

    // Lógica de interactividad (sin cambios)
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

    // --- 👇 FUNCIÓN DE DEMOSTRACIÓN MEJORADA 👇 ---

    // Función auxiliar para crear pausas
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    async function iniciarDemostracionAcordeon() {
        const primerProducto = document.querySelector('.menu-item');
        if (!primerProducto) return;

        const detalles = primerProducto.querySelector('.item-details');
        if (!detalles) return;

        // Espera inicial antes de empezar la animación
        await sleep(1000);

        // Bucle que se repite 2 veces
        for (let i = 0; i < 2; i++) {
            // Abrir
            detalles.classList.add('visible');
            await sleep(500); // Tiempo que permanece abierto

            // Cerrar
            detalles.classList.remove('visible');
            await sleep(500); // Pausa entre repeticiones
        }
    }
});