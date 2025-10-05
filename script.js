

//=========================================
//   FUNCIÓN PARA AGREGAR y ELIMINAR FILA
//=========================================
function agregarFila(){
    const nuevafila = coffeeTable.insertRow();
    nuevafila.innerHTML = `
    <td><input type="text" name="product[]"/></td>
    <td><input type="number" name="price[]"/></td>
    <td><button class="delet-btn" onclick="eliminarFila(this)">X</td>`;
}

function eliminarFila(botonX){
    const fila = botonX.closest('tr');
    fila.remove();
}