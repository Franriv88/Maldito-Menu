document.addEventListener("DOMContentLoaded", () => {
    const menuGrid = document.getElementById("menu-grid");
    const form = document.getElementById("product-form");

    // Cargar productos guardados en localStorage
    let products = JSON.parse(localStorage.getItem("menu")) || [];
    renderMenu();

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const price = document.getElementById("price").value;
            const imageFile = document.getElementById("image").files[0];

            if (imageFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const newProduct = { name, price, image: event.target.result };
                    products.push(newProduct);
                    localStorage.setItem("menu", JSON.stringify(products));
                    renderMenu();
                    form.reset();
                };
                reader.readAsDataURL(imageFile);
            }
        });
    }

    function renderMenu() {
        menuGrid.innerHTML = "";
        products.forEach((product, index) => {
            const productElement = document.createElement("div");
            productElement.classList.add("product");
            productElement.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>Precio: $${product.price}</p>
                ${form ? `<button onclick="deleteProduct(${index})">Eliminar</button>` : ""}
            `;
            menuGrid.appendChild(productElement);
        });
    }

    window.deleteProduct = (index) => {
        products.splice(index, 1);
        localStorage.setItem("menu", JSON.stringify(products));
        renderMenu();
    };
});
