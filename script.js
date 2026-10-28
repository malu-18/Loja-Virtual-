"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function readStorage(key, fallback) {
    let storedValue;
    try {
        storedValue = localStorage.getItem(key);
        return storedValue === null ? fallback : JSON.parse(storedValue);
    } catch (error) {
        if (key === "pinkStoreTheme" && (storedValue === "light" || storedValue === "dark")) {
            return storedValue;
        }
        console.error(`Não foi possível ler "${key}" do armazenamento local.`, error);
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Não foi possível salvar "${key}" no armazenamento local.`, error);
    }
}

const menuBtn = $("#menuBtn");
const navbar = $("#navbar");
const searchBtn = $("#searchBtn");
const searchBox = $("#searchBox");
const searchInput = $("#searchInput");
const cartButton = $("#cartBtn");
const cartDrawer = $("#cart");
const overlay = $("#overlay");
const toast = $("#toast");
const cartItems = $("#cartItems");
const cartCount = $("#cartCount");
const cartTotal = $("#cartTotal");
let cart = readStorage("pinkStoreCart", []);
let toastTimer;
let returnFocusTo = null;

if (!Array.isArray(cart)) {
    console.error("O carrinho salvo está em um formato inválido; iniciando um carrinho vazio.");
    cart = [];
}
cart = cart.filter(item =>
    item &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    Number.isFinite(item.price) &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.image === "string"
);
const currentProducts = new Map(
    $$(".buy-btn").map(button => [button.dataset.id, {
        name: button.dataset.name,
        price: Number(button.dataset.price),
        image: button.dataset.image
    }])
);
cart = cart.map(item => {
    const currentProduct = currentProducts.get(item.id);
    return currentProduct ? { ...item, ...currentProduct } : item;
});
writeStorage("pinkStoreCart", cart);

function showToast(message) {
    $("#toast span").textContent = message;
    toast.classList.add("active");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("active"), 2800);
}

const heroCarousel = $("#heroCarousel");
const heroSlides = $$(".hero-slide", heroCarousel);
const heroDots = $("#heroCarouselDots");
const heroCaptions = ["Victoria's Secret", "Fashion Show 2026", "Desfile Victoria's Secret"];
let activeHeroSlide = 0;
let heroCarouselTimer;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function showHeroSlide(index) {
    activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeHeroSlide;
        slide.classList.toggle("active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
        heroDots.children[slideIndex].classList.toggle("active", isActive);
        heroDots.children[slideIndex].setAttribute("aria-current", isActive ? "true" : "false");
    });
    $("#heroSlideCount").textContent = `${String(activeHeroSlide + 1).padStart(2, "0")} / ${String(heroSlides.length).padStart(2, "0")}`;
    $("#heroSlideCaption").textContent = heroCaptions[activeHeroSlide];
}

function stopHeroCarousel() {
    window.clearInterval(heroCarouselTimer);
}

function startHeroCarousel() {
    stopHeroCarousel();
    if (!reduceMotion.matches && !document.hidden) {
        heroCarouselTimer = window.setInterval(() => showHeroSlide(activeHeroSlide + 1), 5000);
    }
}

heroSlides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-carousel-dot";
    dot.setAttribute("aria-label", `Mostrar foto ${index + 1}`);
    dot.addEventListener("click", () => {
        showHeroSlide(index);
        startHeroCarousel();
    });
    heroDots.append(dot);
});

$("#heroPrevious").addEventListener("click", () => {
    showHeroSlide(activeHeroSlide - 1);
    startHeroCarousel();
});
$("#heroNext").addEventListener("click", () => {
    showHeroSlide(activeHeroSlide + 1);
    startHeroCarousel();
});
heroCarousel.addEventListener("mouseenter", stopHeroCarousel);
heroCarousel.addEventListener("mouseleave", startHeroCarousel);
heroCarousel.addEventListener("focusin", stopHeroCarousel);
heroCarousel.addEventListener("focusout", event => {
    if (!heroCarousel.contains(event.relatedTarget)) startHeroCarousel();
});
document.addEventListener("visibilitychange", startHeroCarousel);
reduceMotion.addEventListener("change", startHeroCarousel);
showHeroSlide(0);
startHeroCarousel();

function closeMenu() {
    navbar.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Abrir menu");
    $("i", menuBtn).className = "fa-solid fa-bars";
}

menuBtn.addEventListener("click", () => {
    const isOpen = navbar.classList.toggle("active");
    menuBtn.setAttribute("aria-expanded", String(isOpen));
    menuBtn.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    $("i", menuBtn).className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
});

$$(".navbar a").forEach(link => link.addEventListener("click", closeMenu));

searchBtn.addEventListener("click", () => {
    const isOpen = searchBox.classList.toggle("active");
    searchBtn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) searchInput.focus();
});

$("#closeSearch").addEventListener("click", () => {
    searchBox.classList.remove("active");
    searchBtn.setAttribute("aria-expanded", "false");
    searchBtn.focus();
});

searchBox.addEventListener("submit", event => event.preventDefault());
searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
    let visibleProducts = 0;
    $$(".product-card").forEach(card => {
        const matches = card.dataset.name.toLocaleLowerCase("pt-BR").includes(query);
        card.hidden = !matches;
        if (matches) visibleProducts += 1;
    });
    $("#noProducts").hidden = visibleProducts !== 0;
});

const savedTheme = readStorage("pinkStoreTheme", "light");
if (savedTheme === "dark") document.body.classList.add("dark");

function updateThemeButton() {
    const darkMode = document.body.classList.contains("dark");
    $("#themeBtn").setAttribute("aria-label", darkMode ? "Ativar tema claro" : "Ativar tema escuro");
    $("i", $("#themeBtn")).className = darkMode ? "fa-regular fa-sun" : "fa-regular fa-moon";
}

$("#themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    writeStorage("pinkStoreTheme", document.body.classList.contains("dark") ? "dark" : "light");
    updateThemeButton();
});
updateThemeButton();

function openCart() {
    returnFocusTo = document.activeElement;
    cartDrawer.classList.add("active");
    cartDrawer.setAttribute("aria-hidden", "false");
    overlay.classList.add("active");
    document.body.classList.add("no-scroll");
    $("#closeCart").focus();
}

function closeCart() {
    cartDrawer.classList.remove("active");
    cartDrawer.setAttribute("aria-hidden", "true");
    overlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
    if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
}

cartButton.addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

function saveCart() {
    writeStorage("pinkStoreCart", cart);
}

function createCartItem(product) {
    const item = document.createElement("article");
    item.className = "cart-item";

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    const info = document.createElement("div");
    info.className = "cart-item-info";
    const name = document.createElement("strong");
    name.textContent = product.name;
    const price = document.createElement("span");
    price.textContent = currency.format(product.price);

    const quantity = document.createElement("div");
    quantity.className = "quantity";
    quantity.setAttribute("aria-label", `Quantidade de ${product.name}`);
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Diminuir quantidade de ${product.name}`);
    decrease.addEventListener("click", () => changeQuantity(product.id, -1));
    const count = document.createElement("span");
    count.textContent = String(product.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Aumentar quantidade de ${product.name}`);
    increase.addEventListener("click", () => changeQuantity(product.id, 1));
    quantity.append(decrease, count, increase);
    info.append(name, price, quantity);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.setAttribute("aria-label", `Remover ${product.name} da sacola`);
    const removeIcon = document.createElement("i");
    removeIcon.className = "fa-solid fa-trash";
    removeIcon.setAttribute("aria-hidden", "true");
    remove.append(removeIcon);
    remove.addEventListener("click", () => {
        cart = cart.filter(itemInCart => itemInCart.id !== product.id);
        saveCart();
        renderCart();
        showToast("Produto removido da sacola.");
    });

    item.append(image, info, remove);
    return item;
}

function renderCart() {
    cartItems.replaceChildren();
    if (cart.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-cart";
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-bag-shopping";
        icon.setAttribute("aria-hidden", "true");
        const title = document.createElement("strong");
        title.textContent = "Sua sacola está esperando";
        const message = document.createElement("span");
        message.textContent = "Adicione seus favoritos para começar.";
        empty.append(icon, title, message);
        cartItems.append(empty);
    } else {
        cart.forEach(product => cartItems.append(createCartItem(product)));
    }

    const totalQuantity = cart.reduce((total, product) => total + product.quantity, 0);
    const totalPrice = cart.reduce((total, product) => total + product.price * product.quantity, 0);
    cartCount.textContent = String(totalQuantity);
    cartButton.setAttribute("aria-label", `Abrir sacola, ${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`);
    cartTotal.textContent = currency.format(totalPrice);
}

function changeQuantity(id, amount) {
    const product = cart.find(item => item.id === id);
    if (!product) return;
    product.quantity += amount;
    if (product.quantity <= 0) cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

$$(".buy-btn").forEach(button => {
    button.addEventListener("click", () => {
        const product = {
            id: button.dataset.id,
            name: button.dataset.name,
            price: Number(button.dataset.price),
            image: button.dataset.image
        };
        const existing = cart.find(item => item.id === product.id);
        if (existing) existing.quantity += 1;
        else cart.push({ ...product, quantity: 1 });
        saveCart();
        renderCart();
        showToast(`${product.name} foi adicionada à sua sacola.`);
    });
});

$$(".favorite").forEach(button => {
    button.addEventListener("click", () => {
        const isFavorite = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(isFavorite));
        $("i", button).className = isFavorite ? "fa-solid fa-heart" : "fa-regular fa-heart";
        showToast(isFavorite ? "Produto adicionado aos favoritos." : "Produto removido dos favoritos.");
    });
});

$("#newsletterForm").addEventListener("submit", event => {
    event.preventDefault();
    showToast("Cadastro recebido! Esta demonstração não envia e-mails.");
    event.currentTarget.reset();
});

$("#checkoutBtn").addEventListener("click", () => {
    if (cart.length === 0) {
        showToast("Sua sacola está vazia.");
        return;
    }
    showToast("Loja em modo de demonstração: a compra não será processada.");
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (cartDrawer.classList.contains("active")) closeCart();
        if (searchBox.classList.contains("active")) {
            searchBox.classList.remove("active");
            searchBtn.setAttribute("aria-expanded", "false");
        }
        closeMenu();
    }
});

renderCart();
