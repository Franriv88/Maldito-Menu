// Espera a que todo el contenido del HTML esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('menu-container');
    const menuDataString = localStorage.getItem('menuData');

    if (!menuDataString) {
        menuContainer.innerHTML = '<p>El menú no está disponible en este momento.</p>';
        return;
    }

    const menuData = JSON.parse(menuDataString);

    // --- SECCIÓN 1: CAFÉ DE ESPECIALIDAD (Texto a la izquierda, Imagen a la derecha) ---
    if (menuData.especialidad && menuData.especialidad.length > 0) {
        // Contenedor principal para la sección
        let seccionHTML = `
            <div class="menu-section">
                <div class="menu-content">
                    <h2>CAFÉ DE ESPECIALIDAD</h2>`;
        
        // Agregamos cada item de producto
        // menuData.especialidad.forEach(item => {
        //     seccionHTML += `
        //         <div class="menu-item">
        //             <span class="producto">${item.producto}</span>
        //             <span class="precio">$${item.precio}</span>
        //         </div>`;
        // });
        menuData.especialidad.forEach(item => {
    // Aquí puedes añadir descripciones para cada plato
    const descripciones = {
        "Doppio": "Doble shot de espresso con leche vaporizada, creando una textura aterciopelada.",
        "Café Irlandés": "Whisky irlandés, café recién hecho, crema batida y un toque de nuez moscada.",
        // Añade más descripciones aquí...
    };

    const descripcion = descripciones[item.producto] || "El clásico de la casa."; // Una descripción por defecto

    seccionHTML += `
        <div class="menu-item" data-producto="${item.producto}" data-categoria="CAFÉ DE ESPECIALIDAD">
            <div class="item-header">
                <span class="producto">${item.producto}</span>
                <span class="precio">$${item.precio}</span>
            </div>
            <div class="item-details">
                <p>${descripcion}</p>
            </div>
        </div>
    `;
});
        
        // Cerramos la columna de contenido y abrimos la de la imagen
        seccionHTML += `
                </div>
                <div class="menu-image">
                    <img src="./img/img/coffee.png" alt="Taza de café">
                </div>
            </div>`;
        
        menuContainer.innerHTML += seccionHTML;
    }

    // --- SECCIÓN 2: CAFÉ FRÍO (Imagen a la izquierda, Texto a la derecha) ---
    if (menuData.frio && menuData.frio.length > 0) {
        // A este contenedor le añadimos la clase "layout-reversed" para invertir el orden
        let seccionHTML = `
            <div class="menu-section layout-reversed">
                <div class="menu-content">
                    <h2>CAFÉ FRÍO</h2>`;
        
        menuData.frio.forEach(item => {
            seccionHTML += `
                <div class="menu-item">
                    <span class="producto">${item.producto}</span>
                    <span class="precio">$${item.precio}</span>
                </div>`;
        });
        
        seccionHTML += `
                </div>
                <div class="menu-image">
                    <img src="./img/img/croissant.png" alt="Café frío y croissant">
                </div>
            </div>`;
            
        menuContainer.innerHTML += seccionHTML;




        // =====================================================================
    // --- AQUÍ COMIENZA EL CÓDIGO DEL PUNTO B ---
    // Este código escucha los clics en todo el menú.
    // =====================================================================
    menuContainer.addEventListener('click', (evento) => {
        // Busca el contenedor principal del item al que se le hizo clic
        const menuItem = evento.target.closest('.menu-item');

        if (menuItem) {
            // --- 1. Lógica para mostrar/ocultar los detalles (el acordeón) ---
            const details = menuItem.querySelector('.item-details');
            details.classList.toggle('visible');

            // --- 2. Lógica para enviar el evento a Analytics ---
            const producto = menuItem.dataset.producto;
            const categoria = menuItem.dataset.categoria;

            console.log(`Enviando evento: ${producto} en ${categoria}`); // Para pruebas

            // Se asegura de que la función gtag exista antes de llamarla
            if (typeof gtag === 'function') {
                gtag('event', 'view_item_details', {
                    'item_name': producto,
                    'item_category': categoria
                });
            }
        }
    });
    // =====================================================================
    // --- AQUÍ TERMINA EL CÓDIGO DEL PUNTO B ---
    // =====================================================================

    }

});



