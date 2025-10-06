// script.js (Versión Final y Definitiva con Firebase)

document.addEventListener('DOMContentLoaded', () => {
    cargarMenuExistente();
    document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);
});

function agregarFila(boton_agregar) {
    const tabla = boton_agregar.nextElementSibling;
    const tbody = tabla.querySelector('tbody');
    const nuevaFila = tbody.insertRow();
    nuevaFila.innerHTML = `
        <td class="col-product"><input type="text" name="product[]" placeholder="Nombre"/></td>
        <td class="col-price"><input type="number" name="price[]" placeholder="Precio"/></td>
        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
}

function eliminarFila(boton_eliminar) {
    const fila = boton_eliminar.closest('tr');
    if (fila) {
        fila.remove();
    }
}

async function cargarMenuExistente() {
    // Esta función carga los datos existentes desde Firebase al panel de admin
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
            tabla.innerHTML = ''; // Limpiar la tabla

            if (productosPorCategoria[categoria] && productosPorCategoria[categoria].length > 0) {
                productosPorCategoria[categoria].forEach(producto => {
                    const nuevaFila = tabla.insertRow();
                    nuevaFila.innerHTML = `
                        <td class="col-product"><input type="text" name="product[]" value="${producto.nombre || ''}"/></td>
                        <td class="col-price"><input type="number" name="price[]" value="${producto.precio || ''}"/></td>
                        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
                });
            } else {
                 const nuevaFila = tabla.insertRow();
                 nuevaFila.innerHTML = `
                    <td class="col-product"><input type="text" name="product[]" placeholder="Nombre"/></td>
                    <td class="col-price"><input type="number" name="price[]" placeholder="Precio"/></td>
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

    // Objeto para definir el orden de las categorías
    const ordenes = {
        "CAFÉ DE ESPECIALIDAD": 1,
        "CAFÉ FRÍO": 2,
        "BEBIDAS": 3, 
        "EXTRAS": 4,
        "SALADOS": 5,
        "LAMINADOS": 6
    };

    const productosParaGuardar = [];

    // Lógica escalable: encuentra TODOS los h2 y los trata como categorías
    document.querySelectorAll('.block__item').forEach(block => {
        block.querySelectorAll('h2').forEach(h2 => {
            const categoria = h2.textContent.trim();
            const tabla = h2.nextElementSibling.nextElementSibling;

            tabla.querySelectorAll('tbody tr').forEach((fila, index) => {
                const productoInput = fila.querySelector('input[type="text"]');
                const precioInput = fila.querySelector('input[type="number"]');

                if (productoInput && productoInput.value && precioInput && precioInput.value) {
                    productosParaGuardar.push({
                        nombre: productoInput.value.trim(),
                        precio: parseFloat(precioInput.value),
                        categoria: categoria,
                        descripcion: "",
                        orden: ordenes[categoria] || 99,
                        ordenProducto: index
                    });
                }
            });
        });
    });

    try {
        // Borra todo lo anterior para sincronizar
        const snapshotActual = await db.collection('productos').get();
        const deletePromises = snapshotActual.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        // Añade los nuevos productos con el orden correcto
        const addPromises = productosParaGuardar.map(producto => db.collection('productos').add(producto));
        await Promise.all(addPromises);

        alert('¡Menú guardado con éxito en Firebase!');
        console.log("Datos guardados en Firestore:", productosParaGuardar);
    } catch (error) {
        console.error("Error al guardar el menú en Firebase:", error);
        alert('Hubo un error al guardar. Revisa la consola.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Menú';
    }
}