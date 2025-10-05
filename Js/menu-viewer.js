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
        menuData.especialidad.forEach(item => {
            seccionHTML += `
                <div class="menu-item">
                    <span class="producto">${item.producto}</span>
                    <span class="precio">$${item.precio}</span>
                </div>`;
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
    }

});