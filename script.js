// script.js (Versión Final y Definitiva con Descripciones)

document.addEventListener('DOMContentLoaded', () => {
    cargarMenuExistente();
    document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);
});

function agregarFila(boton_agregar) {
    const tabla = boton_agregar.nextElementSibling;
    const tbody = tabla.querySelector('tbody');
    const nuevaFila = tbody.insertRow();
    // AÑADIDO: Input para la descripción
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

async function cargarMenuExistente() {
    try {
        const snapshot = await db.collection('productos').orderBy('orden', 'asc').orderBy('ordenProducto', 'asc').get();
        const productosPorCategoria = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!productosPorCategoria[data.categoria]) {
                productosPorCategoria[data.categoria] = [];
            }
            productosPorCategoria[data.categoria].push({ id: doc.id, ...data });
        });

        document.querySelectorAll('h2').forEach(h2 => {
            const categoria = h2.textContent.trim();
            const tabla = h2.nextElementSibling.nextElementSibling.querySelector('tbody');
            tabla.innerHTML = '';

            if (productosPorCategoria[categoria] && productosPorCategoria[categoria].length > 0) {
                productosPorCategoria[categoria].forEach(producto => {
                    const nuevaFila = tabla.insertRow();
                    // AÑADIDO: Carga el valor de la descripción
                    nuevaFila.innerHTML = `
                        <td class="col-product"><input type="text" name="product[]" value="${producto.nombre || ''}"/></td>
                        <td class="col-price"><input type="number" name="price[]" value="${producto.precio || ''}"/></td>
                        <td class="col-description"><input type="text" name="description[]" value="${producto.descripcion || ''}"/></td>
                        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
                });
            } else {
                const nuevaFila = tabla.insertRow();
                // AÑADIDO: Input para la descripción en filas nuevas
                nuevaFila.innerHTML = `
                    <td class="col-product"><input type="text" name="product[]" placeholder="Nombre"/></td>
                    <td class="col-price"><input type="number" name="price[]" placeholder="Precio"/></td>
                    <td class="col-description"><input type="text" name="description[]" placeholder="Descripción"/></td>
                    <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
            }
        });
    } catch (error) {
        console.error("Error al cargar menú existente:", error);
    }
}

async function guardarMenu() {
    const saveBtn = document.getElementById('saveMenuBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

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

    document.querySelectorAll('.block__item').forEach(block => {
        block.querySelectorAll('h2').forEach(h2 => {
            const categoria = h2.textContent.trim();
            const tabla = h2.nextElementSibling.nextElementSibling;

            tabla.querySelectorAll('tbody tr').forEach((fila, index) => {
                const productoInput = fila.querySelector('input[name="product[]"]');
                const precioInput = fila.querySelector('input[name="price[]"]');
                // AÑADIDO: Lee el input de la descripción
                const descripcionInput = fila.querySelector('input[name="description[]"]');

                if (productoInput && productoInput.value && precioInput && precioInput.value) {
                    productosParaGuardar.push({
                        nombre: productoInput.value.trim(),
                        precio: parseFloat(precioInput.value),
                        categoria: categoria,
                        // AÑADIDO: Guarda el valor de la descripción
                        descripcion: descripcionInput ? descripcionInput.value.trim() : "",
                        orden: ordenes[categoria] || 99,
                        ordenProducto: index
                    });
                }
            });
        });
    });

    try {
        const snapshotActual = await db.collection('productos').get();
        const deletePromises = snapshotActual.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        const addPromises = productosParaGuardar.map(producto => db.collection('productos').add(producto));
        await Promise.all(addPromises);

        alert('¡Menú guardado con éxito en Firebase!');
    } catch (error) {
        console.error("Error al guardar el menú en Firebase:", error);
        alert('Hubo un error al guardar. Revisa la consola.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Menú';
    }
}