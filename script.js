/* ==========================================================================
   Third Pour – script.js

   Contents
   1.  Helpers
   2.  Preloader
   3.  Scroll effects (header, progress bar, parallax)
   4.  Theme switching and reveal-on-scroll
   5.  Menu data
   6.  Menu tabs and item list
   7.  Toast notifications
   8.  Magnetic button
   9.  Cart: state and storage
   10. Cart: rendering
   11. Cart: interactions and checkout
   12. Page transition and routing (#cart)
   ========================================================================== */


/* ---------- 1. Helpers ---------- */

// Shorthand for querySelector / querySelectorAll (the latter returns a real array)
const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Respect the user's "reduce motion" setting
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Escape text before inserting it into innerHTML (prevents HTML injection)
const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");


/* ---------- 2. Preloader ---------- */

const loader = $("#ld");

setTimeout(() => {
    document.body.classList.add("go"); // starts the hero entrance animations
    loader.classList.add("done");      // slides the loader up
    setTimeout(() => loader.remove(), 1100);
}, prefersReducedMotion ? 50 : 1900);


/* ---------- 3. Scroll effects ---------- */

const header       = $("header");
const progressBar  = $("#bar");
const heroBg       = $("#bg");
const ghostText    = $("#gh");
const bakerySection = $("#bake");

function onScroll() {
    // Solid, blurred header once the user leaves the top of the page
    header.classList.toggle("s", scrollY > 40);

    // Reading-progress bar across the top
    progressBar.style.transform = `scaleX(${scrollY / (document.documentElement.scrollHeight - innerHeight)})`;

    // Hero background parallax (moves slower than the page, capped at one screen)
    heroBg.style.transform = `translateY(${Math.min(scrollY, innerHeight) * 0.22}px)`;

    // Giant ghost text in the bakery section drifts left as the section scrolls past
    const rect = bakerySection.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
    ghostText.style.transform = `translateX(${10 - progress * 130}vw)`;
}

addEventListener("scroll", onScroll, { passive: true });
onScroll();


/* ---------- 4. Theme switching and reveal-on-scroll ---------- */

// When a section crosses the middle of the viewport, apply its data-theme to <body>
const themeObserver = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) document.body.dataset.theme = entry.target.dataset.theme;
    }),
    { rootMargin: "-50% 0px -49% 0px" } // a thin band at the vertical centre
);
$$("section[data-theme]").forEach((section) => themeObserver.observe(section));

// Fade elements in the first time they become visible
const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target); // only animate once
        }
    }),
    { threshold: 0.2 }
);
$$(".rv").forEach((el) => revealObserver.observe(el));


/* ---------- 5. Menu data ---------- */
// Each item is [name, description, price in ₹]

const MENU = {
    Coffee: [
        ["Espresso",          "Short, dark and a little sweet",                  110],
        ["Doppio",            "A double shot, same sweetness",                   170],
        ["Flat white",        "Silky milk over a double ristretto",              190],
        ["Cappuccino, small", "Foam you could stand a spoon in",                 150],
        ["Cappuccino, large", "The same, for a longer morning",                  190],
        ["Filter kaapi",      "Slow decoction, hot milk, served in a dabara",    120],
        ["Decaf",             "All the flavour, none of the jitters",            150]
    ],
    Croissants: [
        ["Plain",          "Butter, layers and nothing else", 120],
        ["Cheese",         "Baked with mature cheddar",       170],
        ["Ham and cheese", "Warm, flaky and a little salty",  220],
        ["Chocolate",      "Two bars of dark chocolate",      160],
        ["Hazelnut",       "Praline and toasted hazelnut",    170]
    ],
    Bagels: [
        ["Plain",         "Chewy, boiled first and then baked", 120],
        ["Cream cheese",  "Whipped, with chives",               170],
        ["Smoked salmon", "Cream cheese, dill and lemon",       260],
        ["Cheese",        "Melted cheddar crust",               160]
    ],
    Combos: [
        ["Morning pair",      "Large cappuccino and any croissant",         260],
        ["The creamy one",    "Large cappuccino and a cream cheese bagel",  280],
        ["The big breakfast", "Any coffee, any croissant and any bagel",    420]
    ]
};


/* ---------- 6. Menu tabs and item list ---------- */

const menuList  = $("#list");
const tabsEl    = $("#tabs");
const indicator = $("#ind");
let renderToken = 0; // lets a newer tab click cancel an older, still-pending render

// Build one tab button per menu category
Object.keys(MENU).forEach((category, i) => {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", i === 0);
    tab.textContent = category;
    tab.onclick = () => showCategory(category, tab);
    tabsEl.append(tab);
});

// Slide the highlight pill under the given tab
const moveIndicator = (tab) => {
    indicator.style.left  = tab.offsetLeft + "px";
    indicator.style.width = tab.offsetWidth + "px";
};

// One placeholder row, shown while the list "loads"
const SKELETON_ROW =
    '<li class="skl">' +
        '<div><i class="sk" style="width:40%"></i><i class="sk" style="width:70%"></i></div>' +
        '<i class="sk" style="width:3rem"></i>' +
        '<i class="sk" style="width:6.5rem;height:2rem;border-radius:99px"></i>' +
    '</li>';

// Show skeleton rows briefly, then render the real items for a category
function showCategory(category, tab) {
    $$(".tab").forEach((t) => t.setAttribute("aria-selected", t === tab));
    moveIndicator(tab);

    const token = ++renderToken;
    menuList.innerHTML = MENU[category].map(() => SKELETON_ROW).join("");

    setTimeout(() => {
        if (token !== renderToken) return; // a newer tab was selected meanwhile

        menuList.innerHTML = MENU[category].map(([name, description, price], i) => `
            <li style="--i:${i}">
                <div><h3>${name}</h3><p>${description}</p></div>
                <span class="pr">₹${price}</span>
                <button class="add" type="button" data-n="${name}">Add</button>
            </li>`).join("");
    }, prefersReducedMotion ? 0 : 600);
}

// Initial render, and keep the indicator aligned on resize / after fonts load
addEventListener("load", () => showCategory("Coffee", $(".tab")));
addEventListener("resize", () => moveIndicator($('.tab[aria-selected="true"]')));
document.fonts.ready.then(() => moveIndicator($('.tab[aria-selected="true"]')));


/* ---------- 7. Toast notifications ---------- */

const toastEl = $("#toast");
let toastTimer;

function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}


/* ---------- 8. Magnetic button ---------- */
// On devices with a mouse, the "Plan your visit" button drifts toward the cursor when it is near.

const magnetBtn = $("#mag");

if (!prefersReducedMotion && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", (e) => {
        const rect = magnetBtn.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);

        // Pull the button 25% of the way toward the cursor inside a 180px radius
        magnetBtn.style.translate = Math.hypot(dx, dy) < 180 ? `${dx * 0.25}px ${dy * 0.25}px` : "0 0";
    });
}


/* ---------- 9. Cart: state and storage ---------- */
// Cart item shape: { id, nm (name), cat (category), p (unit price), q (quantity) }

let cart = [];

// Restore the saved cart, discarding anything malformed
try {
    cart = JSON.parse(localStorage.getItem("tp_cart") || "[]").filter(
        (i) => i && typeof i.nm === "string" && typeof i.cat === "string" && +i.p > 0 && +i.q > 0
    );
} catch (e) {
    cart = [];
}

const saveCart = () => {
    try { localStorage.setItem("tp_cart", JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
};

const cartQuantity = () => cart.reduce((sum, item) => sum + item.q, 0);
const cartTotal    = () => cart.reduce((sum, item) => sum + item.q * item.p, 0);

// Update the number on the header's Cart button (optionally with a small "bump" animation)
function updateBadge(animate) {
    const count = $("#cnt");
    count.textContent = cartQuantity();
    if (animate) {
        count.classList.remove("b");
        void count.offsetWidth; // force reflow so the animation can restart
        count.classList.add("b");
    }
}


/* ---------- 10. Cart: rendering ---------- */

const cartList    = $("#cl");
const cartSummary = $("#cs");

function renderCart() {
    updateBadge();

    // Empty state
    if (!cart.length) {
        cartList.innerHTML = '<div class="em"><p>Your cart is empty.</p><a class="btn" href="#menu">Browse the menu</a></div>';
        cartSummary.hidden = true;
        return;
    }

    cartSummary.hidden = false;
    cartList.innerHTML = cart.map((item, index) => `
        <li data-id="${escapeHTML(item.id)}" style="animation-delay:${index * 0.06}s">
            <div><h3>${escapeHTML(item.nm)}</h3><p>${escapeHTML(item.cat)}</p></div>
            <div class="qt">
                <button type="button" data-d="-1" aria-label="Less">−</button>
                <b>${item.q}</b>
                <button type="button" data-d="1" aria-label="More">+</button>
            </div>
            <span class="pr">₹${item.p * item.q}</span>
            <button class="rm" type="button" data-rm="1">Remove</button>
        </li>`).join("");

    // Totals (5% GST, rounded to the nearest rupee)
    const subtotal = cartTotal();
    const tax = Math.round(subtotal * 0.05);
    $("#sub").textContent = "₹" + subtotal;
    $("#tx").textContent  = "₹" + tax;
    $("#gt").textContent  = "₹" + (subtotal + tax);
}


/* ---------- 11. Cart: interactions and checkout ---------- */

// "Add" buttons in the menu
menuList.onclick = (e) => {
    const button = e.target.closest(".add");
    if (!button || button.classList.contains("ok")) return;

    const category = $('.tab[aria-selected="true"]').textContent;
    const name     = button.dataset.n;
    const price    = +$(".pr", button.closest("li")).textContent.replace(/\D/g, ""); // "₹120" -> 120
    const id       = category + "|" + name;
    const existing = cart.find((item) => item.id === id);

    if (existing) existing.q++;
    else cart.push({ id, nm: name, cat: category, p: price, q: 1 });

    saveCart();
    updateBadge(true);

    // Brief "Added" confirmation on the button
    button.classList.add("ok");
    button.textContent = "Added";
    toast(`${name} added to your cart. Tap to view.`);
    setTimeout(() => {
        button.classList.remove("ok");
        button.textContent = "Add";
    }, 1800);
};

// Quantity (+/−) and Remove buttons inside the cart
cartList.onclick = (e) => {
    const row = e.target.closest("li");
    if (!row) return;

    const item = cart.find((i) => i.id === row.dataset.id);
    if (!item) return;

    // Remove: fade the row out first, then update the data
    if (e.target.closest("[data-rm]")) {
        row.classList.add("out");
        setTimeout(() => {
            cart = cart.filter((i) => i !== item);
            saveCart();
            renderCart();
        }, 350);
        return;
    }

    // Change quantity (never below 1)
    const stepper = e.target.closest("[data-d]");
    if (stepper) {
        item.q = Math.max(1, item.q + +stepper.dataset.d);
        saveCart();
        renderCart();
    }
};

// Place order: requires a name, then shows the confirmation
$("#po").onclick = () => {
    const nameInput = $("#nm");
    const name = nameInput.value.trim();

    // No name: shake the field and focus it
    if (!name) {
        nameInput.classList.remove("sh");
        void nameInput.offsetWidth; // restart the animation
        nameInput.classList.add("sh");
        nameInput.focus();
        return;
    }

    const orderNumber = 1000 + Math.floor(Math.random() * 9000);
    $("#okh").textContent = `Thank you, ${name}.`;
    $("#okp").textContent = `Order TP-${orderNumber} is being prepared. Collect it at the counter and pay there.`;

    cart = [];
    saveCart();
    updateBadge(true);
    $(".cg").hidden = true;
    $("#ok").hidden = false;
    nameInput.value = "";
};


/* ---------- 12. Page transition and routing ---------- */
// The cart is a view of the same page, toggled by the #cart hash.

const veil = $("#veil");

// Switch between the main site and the cart view (without animation)
function setCartView(on) {
    document.body.classList.toggle("cv", on);
    document.body.dataset.theme = on ? "latte" : "white";

    if (on) {
        $(".cg").hidden = false;
        $("#ok").hidden = true;
        renderCart();
    }

    // When leaving the cart, jump back to the section named in the hash (e.g. #menu)
    let target = null;
    if (!on && location.hash.length > 1) {
        try { target = $(location.hash); } catch (e) { /* invalid selector */ }
    }
    scrollTo({ top: 0, behavior: "instant" });
    if (target) target.scrollIntoView({ behavior: "instant" });
}

// Cover the screen with the veil, switch views behind it, then uncover
function transitionTo(on) {
    if (prefersReducedMotion) {
        setCartView(on);
        return;
    }

    veil.className = "in";
    setTimeout(() => {
        setCartView(on);
        veil.className = "out";
        setTimeout(() => (veil.className = ""), 650);
    }, 600);
}

// Show or hide the cart so it matches the current URL hash
const route = () => {
    const wantsCart = location.hash === "#cart";
    if (wantsCart !== document.body.classList.contains("cv")) transitionTo(wantsCart);
};

addEventListener("hashchange", route);

// The header Cart button and the toast both open the cart
$("#order").onclick = () => { location.hash = "cart"; };
toastEl.onclick     = () => { location.hash = "cart"; };

// Initial state: show the saved cart count, and open the cart if the page loaded on #cart
updateBadge();
setTimeout(route, prefersReducedMotion ? 60 : 2100);
