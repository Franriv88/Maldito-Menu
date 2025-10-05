// script.js

// La variable 'db' (instancia de Firestore) debe estar disponible globalmente
// desde firebase-config.js.

// *** LÓGICA PARA CARGAR EL MENÚ EXISTENTE AL ABRIR admin.html ***
document.addEventListener('DOMContentLoaded', cargarMenuExistente);

async function cargarMenuExistente() {
    console.log("Cargando menú existente desde Firestore...");
    try {
        // Obtenemos los productos una sola vez (get()), no en tiempo real (onSnapshot()) para el admin
        const snapshot = await db.collection('productos').orderBy('categoria', 'asc').get();
        const productos = [];
        snapshot.forEach(doc => {
            productos.push({ id: doc.id, ...doc.data() }); // Guardamos también el ID del documento de Firestore
        });

        // Limpiar todas las tablas de entrada existentes en la interfaz de administración
        document.querySelector('.item--product1 table tbody').innerHTML = '';
        document.querySelector('.item--product2 table tbody').innerHTML = '';

        // Rellenar las tablas con los productos cargados
        productos.forEach(producto => {
            let tabla;
            let productInputName, priceInputName;

            if (producto.categoria === "CAFÉ DE ESPECIALIDAD") {
                tabla = document.querySelector('.item--product1 table tbody');
                productInputName = 'product_especialidad[]';
                priceInputName = 'price_especialidad[]';
            } else if (producto.categoria === "CAFÉ FRÍO") {
                tabla = document.querySelector('.item--product2 table tbody');
                productInputName = 'product_frio[]';
                priceInputName = 'price_frio[]';
            } else {
                console.warn('Producto con categoría no reconocida en Firestore:', producto.categoria);
                return; // Ignorar productos con categorías que esta interfaz de admin no maneja
            }

            // Insertar una nueva fila en la tabla correspondiente
            const nuevaFila = tabla.insertRow();
            // Guardamos el ID del documento de Firestore en un data attribute de la fila, por si lo necesitamos después
            nuevaFila.dataset.firestoreDocId = producto.id;
            nuevaFila.innerHTML = `
                <td class="col-product"><input type="text" name="${productInputName}" value="${producto.nombre || ''}"/></td>
                <td class="col-price"><input type="number" name="${priceInputName}" value="${producto.precio || ''}"/></td>
                <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
        });

        // Si no hay productos, añade una fila vacía por defecto para empezar a añadir
        if (productos.length === 0) {
            agregarFila(document.querySelector('.item--product1 .add-btn')); // Agrega una fila en la primera sección
            agregarFila(document.querySelector('.item--product2 .add-btn')); // Y otra en la segunda
        }

        console.log("Menú existente cargado exitosamente.");
    } catch (error) {
        console.error("Error al cargar el menú existente desde Firestore:", error);
        alert('Hubo un error al cargar el menú existente. Revisa la consola.');
    }
}


// *** LÓGICA PARA GUARDAR EL MENÚ EN FIRESTORE ***
document.getElementById('saveMenuBtn').addEventListener('click', guardarMenu);

async function guardarMenu() {
    // Deshabilitar botón para evitar clics múltiples y dar feedback
    const saveBtn = document.getElementById('saveMenuBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const productosParaGuardar = [];

    // --- Capturar datos de Café de Especialidad ---
    const tablaEspecialidad = document.querySelector('.item--product1 table tbody');
    tablaEspecialidad.querySelectorAll('tr').forEach(fila => {
        const productoInput = fila.querySelector('input[type="text"]');
        const precioInput = fila.querySelector('input[type="number"]');

        if (productoInput && productoInput.value && precioInput && precioInput.value) {
            productosParaGuardar.push({
                nombre: productoInput.value.trim(),
                precio: parseFloat(precioInput.value), // Convertir a número
                categoria: "CAFÉ DE ESPECIALIDAD",
                descripcion: "" // Por ahora, la descripción no se edita aquí, puedes añadir un input si quieres
            });
        }
    });

    // --- Capturar datos de Café Frío ---
    const tablaFrio = document.querySelector('.item--product2 table tbody');
    tablaFrio.querySelectorAll('tr').forEach(fila => {
        const productoInput = fila.querySelector('input[type="text"]');
        const precioInput = fila.querySelector('input[type="number"]');

        if (productoInput && productoInput.value && precioInput && precioInput.value) {
            productosParaGuardar.push({
                nombre: productoInput.value.trim(),
                precio: parseFloat(precioInput.value), // Convertir a número
                categoria: "CAFÉ FRÍO",
                descripcion: "" // Por ahora, la descripción no se edita aquí
            });
        }
    });

    try {
        // 1. ELIMINAR TODOS los productos existentes en Firestore
        //    Esta es la forma más simple de sincronizar el admin UI con Firestore
        //    (borra todo y luego añade lo que está en la tabla).
        console.log("Eliminando productos existentes en Firestore...");
        const snapshotActual = await db.collection('productos').get();
        const deletePromises = [];
        snapshotActual.forEach(doc => {
            deletePromises.push(db.collection('productos').doc(doc.id).delete());
        });
        await Promise.all(deletePromises); // Esperar a que se borren todos

        // 2. AÑADIR los nuevos productos (o los actualizados) a Firestore
        console.log("Añadiendo nuevos productos a Firestore:", productosParaGuardar);
        const addPromises = [];
        if (productosParaGuardar.length > 0) {
            productosParaGuardar.forEach(producto => {
                addPromises.push(db.collection('productos').add(producto));
            });
            await Promise.all(addPromises); // Esperar a que se añadan todos
        }


        alert('¡Menú guardado y actualizado con éxito en Firestore!');
        console.log('Menú actualizado en Firestore:', productosParaGuardar);

    } catch (error) {
        console.error("Error al guardar el menú en Firestore:", error);
        alert('Hubo un error al guardar el menú. Revisa la consola para más detalles.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Menú';
    }
}

// *** FUNCIONES AUXILIARES PARA AGREGAR y ELIMINAR FILAS EN EL UI DEL ADMIN ***

/**
 * Agrega una nueva fila a la tabla que está justo después del botón presionado.
 * @param {HTMLButtonElement} boton_agregar - El botón "+" que fue clickeado.
 */
function agregarFila(boton_agregar) {
    const tabla = boton_agregar.nextElementSibling; // La tabla está justo después del botón
    const tbody = tabla.querySelector('tbody');

    // Determina los nombres de los inputs basados en la sección
    let productInputName = 'product[]';
    let priceInputName = 'price[]';
    if (boton_agregar.closest('.item--product1')) {
        productInputName = 'product_especialidad[]';
        priceInputName = 'price_especialidad[]';
    } else if (boton_agregar.closest('.item--product2')) {
        productInputName = 'product_frio[]';
        priceInputName = 'price_frio[]';
    }

    const nuevaFila = tbody.insertRow();
    nuevaFila.innerHTML = `
        <td class="col-product"><input type="text" name="${productInputName}"/></td>
        <td class="col-price"><input type="number" name="${priceInputName}"/></td>
        <td><button class="delete-btn" onclick="eliminarFila(this)">X</button></td>`;
}

/**
 * Elimina la fila (tr) a la que pertenece el botón presionado.
 * @param {HTMLButtonElement} boton_eliminar - El botón "X" que fue clickeado.
 */
function eliminarFila(boton_eliminar) {
    const fila = boton_eliminar.closest('tr');
    if (fila) {
        fila.remove();
    }
    // NOTA: La eliminación de Firestore se maneja al presionar "Guardar Menú"
    // con la estrategia de "eliminar todo y volver a añadir".
}
