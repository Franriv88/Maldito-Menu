// script.js (Versión Final y Definitiva con Firebase)

// =====================================================================
// EVENTOS PRINCIPALES
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {
    cargarMenuExistente();
    document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);
});


// =====================================================================
// FUNCIONES AUXILIARES PARA LA INTERFAZ (AGREGAR/ELIMINAR FILAS)
// =====================================================================

function agregarFila(boton_agregar) {
    const tabla = boton_agregar.nextElementSibling;
    const tbody = tabla.querySelector('tbody');
    const nuevaFila = tbody.insertRow();
    // Crea la fila completa, incluyendo el campo de descripción
    nuevaFila.innerHTML = `
        <td class="col-product"><input type="text" name="product[]" placeholder="Nombre"/></td>
        <td class="col-price"><input type="number" name="price[]" placeholder="Precio"/></td>
        <td class="col-description"><input type="text" name="description[]" placeholder="Descripción"/></td>
        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
}

function eliminarFila(boton_eliminar) {
    const fila = boton_eliminar.closest('tr');
    if (fila) {
        fila.remove();
    }
}


// =====================================================================
// LÓGICA DE FIREBASE (CARGAR Y GUARDAR)
// =====================================================================

async function cargarMenuExistente() {
    try {
        // Pide los productos a Firestore, ya ordenados
        const snapshot = await db.collection('productos').orderBy('orden', 'asc').orderBy('ordenProducto', 'asc').get();
        const productosPorCategoria = {};

        // Agrupa los productos por categoría
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!productosPorCategoria[data.categoria]) {
                productosPorCategoria[data.categoria] = [];
            }
            productosPorCategoria[data.categoria].push({ id: doc.id, ...data });
        });

        // Rellena las tablas del HTML de forma escalable
        document.querySelectorAll('h2').forEach(h2 => {
            const categoria = h2.textContent.trim();
            const tabla = h2.nextElementSibling.nextElementSibling.querySelector('tbody');
            tabla.innerHTML = ''; // Limpia la tabla

            if (productosPorCategoria[categoria] && productosPorCategoria[categoria].length > 0) {
                productosPorCategoria[categoria].forEach(producto => {
                    const nuevaFila = tabla.insertRow();
                    // Rellena la fila con los datos, incluyendo la descripción
                    nuevaFila.innerHTML = `
                        <td class="col-product"><input type="text" name="product[]" value="${producto.nombre || ''}"/></td>
                        <td class="col-price"><input type="number" name="price[]" value="${producto.precio || ''}"/></td>
                        <td class="col-description"><input type="text" name="description[]" value="${producto.descripcion || ''}"/></td>
                        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
                });
            } else {
                 // Si no hay productos para esta categoría, agrega una fila vacía
                 const nuevaFila = tabla.insertRow();
                 nuevaFila.innerHTML = `
                    <td class="col-product"><input type="text" name="product[]" placeholder="Nombre"/></td>
                    <td class="col-price"><input type="number" name="price[]" placeholder="Precio"/></td>
                    <td class="col-description"><input type="text" name="description[]" placeholder="Descripción"/></td>
                    <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
            }
        });
    } catch (error) {
        console.error("Error al cargar menú existente:", error);
        alert("Hubo un error al cargar el menú. Puede que necesites crear un índice en Firebase. Revisa la consola F12.");
    }
}

async function guardarMenu() {
    const saveBtn = document.getElementById('saveMenuBtn');
    
    // Activa el efecto visual de "botón presionado"
    saveBtn.classList.add('is-saving');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    // Define el orden de las categorías
    const ordenes = {
        "CAFÉ DE ESPECIALIDAD": 1,
        "CAFÉ FRÍO":          2,
        "BEBIDAS":            3,
        "EXTRAS":             4,
        "SALADOS":            5,
        "LAMINADOS":          6,
        "DULCES":             7
    };

    const productosParaGuardar = [];

    // Lógica escalable que lee todas las categorías del HTML
    document.querySelectorAll('.block__item').forEach(block => {
        block.querySelectorAll('h2').forEach(h2 => {
            const categoria = h2.textContent.trim();
            const tabla = h2.nextElementSibling.nextElementSibling;

            tabla.querySelectorAll('tbody tr').forEach((fila, index) => {
                const productoInput = fila.querySelector('input[name="product[]"]');
                const precioInput = fila.querySelector('input[name="price[]"]');
                const descripcionInput = fila.querySelector('input[name="description[]"]');

                if (productoInput && productoInput.value && precioInput && precioInput.value) {
                    productosParaGuardar.push({
                        nombre: productoInput.value.trim(),
                        precio: parseFloat(precioInput.value),
                        categoria: categoria,
                        descripcion: descripcionInput ? descripcionInput.value.trim() : "",
                        orden: ordenes[categoria] || 99,
                        ordenProducto: index
                    });
                }
            });
        });
    });

    try {
        // Sincroniza con Firebase: borra todo y vuelve a escribir
        const snapshotActual = await db.collection('productos').get();
        const deletePromises = snapshotActual.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        const addPromises = productosParaGuardar.map(producto => db.collection('productos').add(producto));
        await Promise.all(addPromises);

        alert('¡Menú guardado con éxito en Firebase!');
        console.log("Datos guardados en Firestore:", productosParaGuardar);

    } catch (error) {
        console.error("Error al guardar el menú en Firebase:", error);
        alert('Hubo un error al guardar. Revisa la consola.');
    } finally {
        // Se ejecuta siempre, tanto si hay éxito como si hay error
        // Desactiva el efecto visual y rehabilita el botón
        saveBtn.classList.remove('is-saving');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Menú';
    }
}