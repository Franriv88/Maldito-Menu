//=========================================
//   GUARDA TODO EL MENÚ 
//=========================================

//Esta función recorrerá cada sección, tomará los valores y los guardará como un objeto en localStorage

document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);

function guardarMenu() {
    // Un objeto para guardar toda la data del menú
    const menuData = {
        especialidad: [],
        frio: []
        // Agrega aquí más categorías si las tienes (ej: sandwiches: [])
    };

    // --- Capturar datos de Café de Especialidad ---
    // Usamos querySelector para encontrar la tabla dentro de su contenedor específico
    const tablaEspecialidad = document.querySelector('.item--product1 table tbody');
    tablaEspecialidad.querySelectorAll('tr').forEach(fila => {
        const productoInput = fila.querySelector('input[type="text"]');
        const precioInput = fila.querySelector('input[type="number"]');

        // Solo guardamos si ambos campos tienen valor
        if (productoInput.value && precioInput.value) {
            menuData.especialidad.push({
                producto: productoInput.value,
                precio: precioInput.value
            });
        }
    });

    // --- Capturar datos de Café Frío ---
    const tablaFrio = document.querySelector('.item--product2 table tbody');
    tablaFrio.querySelectorAll('tr').forEach(fila => {
        const productoInput = fila.querySelector('input[type="text"]');
        const precioInput = fila.querySelector('input[type="number"]');
        
        if (productoInput.value && precioInput.value) {
            menuData.frio.push({
                producto: productoInput.value,
                precio: precioInput.value
            });
        }
    });

    // Convertimos el objeto a un string JSON y lo guardamos en localStorage
    localStorage.setItem('menuData', JSON.stringify(menuData));
    
    alert('¡Menú guardado con éxito!');
}

//=========================================
//   FUNCIÓN PARA AGREGAR y ELIMINAR FILA
//=========================================
// function agregarFila(){
//     const nuevafila = coffeeTable.insertRow();
//     nuevafila.innerHTML = `
//     <td><input type="text" name="product[]"/></td>
//     <td><input type="number" name="price[]"/></td>
//     <td><button class="delete-btn" onclick="eliminarFila(this)">X</td>`;
// }

// function eliminarFila(botonX){
//     const fila = botonX.closest('tr');
//     fila.remove();
// }

/**
 * Agrega una nueva fila a la tabla que está justo después del botón presionado.
 * @param {HTMLButtonElement} boton_agregar - El botón "+" que fue clickeado.
 */
function agregarFila(boton_agregar) {
    // Desde el botón, busca el elemento siguiente (que es la <table>)
    const tabla = boton_agregar.nextElementSibling;
    
    // Inserta una fila en el cuerpo de la tabla (tbody)
    const nuevaFila = tabla.tBodies[0].insertRow();

    // El resto de tu lógica es casi igual, pero con las etiquetas bien cerradas
    nuevaFila.innerHTML = `
        <td class="col-product"><input type="text" name="product[]"/></td>
        <td class="col-price"><input type="number" name="price[]"/></td>
        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
}

/**
 * Elimina la fila (tr) a la que pertenece el botón presionado.
 * Esta función ya funcionaba bien y no necesita cambios.
 * @param {HTMLButtonElement} boton_eliminar - El botón "X" que fue clickeado.
 */
function eliminarFila(boton_eliminar) {
    // Sube por el DOM hasta encontrar el 'tr' y lo elimina
    const fila = boton_eliminar.closest('tr');
    if (fila) {
        fila.remove();
    }
}