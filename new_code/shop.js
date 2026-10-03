const productsEl = document.getElementById("products");
const cartEl     = document.getElementById("cartItems");
const totalEl    = document.getElementById("cartTotal");
const checkoutEl = document.getElementById("checkout");
const msg        = document.getElementById("msg");
const accountEl  = document.getElementById("account");
const searchEl   = document.getElementById("search");
const searchInfo = document.getElementById("searchInfo");

let products = [];
const cart = new Map(); // productId -> quantity

// Cart survives the trip to the login page. Storage can be unavailable, so ignore failures.
function saveCart() {
  try { localStorage.setItem("cart", JSON.stringify([...cart])); } catch {}
}
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("cart") || "[]");
    for (const [id, qty] of saved)
      if (products.some((p) => p.id === id) && Number.isInteger(qty) && qty > 0)
        cart.set(id, Math.min(qty, 10));
  } catch {}
}

const money = (n) => "$" + n.toFixed(2);

// Build elements with textContent only, never innerHTML.
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function show(text, cls) {
  msg.textContent = text;
  msg.className = "msg " + cls;
}

function renderProducts() {
  const query = searchEl.value.trim();
  const matches = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()));

  // FIX 9 - the search term is shown with textContent, so markup in it is never executed.
  searchInfo.textContent = query ? `Results for "${query}": ${matches.length}` : "";

  productsEl.replaceChildren();
  for (const p of matches) {
    const card = el("div", "card");
    const btn = el("button", null, "Add to cart");
    btn.addEventListener("click", () => changeQty(p.id, 1));
    card.append(
      el("div", "emoji", p.emoji),
      el("div", "name", p.name),
      el("div", "desc", p.description),
      el("div", "price", money(p.price)),
      btn
    );
    productsEl.append(card);
  }
}

function renderCart() {
  cartEl.replaceChildren();
  let total = 0;
  for (const [id, qty] of cart) {
    const p = products.find((x) => x.id === id);
    total += p.price * qty;

    const minus = el("button", null, "−");
    const plus  = el("button", null, "+");
    minus.addEventListener("click", () => changeQty(id, -1));
    plus.addEventListener("click", () => changeQty(id, 1));

    const qtyBox = el("span", "qty");
    qtyBox.append(minus, el("span", null, String(qty)), plus);

    const li = el("li");
    li.append(el("span", null, p.name), qtyBox);
    cartEl.append(li);
  }
  if (cart.size === 0) cartEl.append(el("li", null, "Cart is empty."));
  totalEl.textContent = money(total);
  checkoutEl.disabled = cart.size === 0;
}

function changeQty(id, delta) {
  const qty = (cart.get(id) || 0) + delta;
  if (qty <= 0) cart.delete(id);
  else cart.set(id, Math.min(qty, 10));
  saveCart();
  show("", "");
  renderCart();
}

checkoutEl.addEventListener("click", async () => {
  // Only ids and quantities are sent; the server looks up prices itself.
  const items = [...cart].map(([id, qty]) => ({ id, qty }));
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (res.ok) {
      cart.clear();
      saveCart();
      renderCart();
      show(`Order placed! Total charged: ${money(data.total)}`, "ok");
    } else if (res.status === 401) {
      show("Please log in to check out. Redirecting…", "err");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } else {
      show(data.message, "err");
    }
  } catch {
    show("Could not reach server.", "err");
  }
});

async function renderAccount() {
  accountEl.replaceChildren();
  const res = await fetch("/api/me").catch(() => null);
  if (res && res.ok) {
    const { email } = await res.json();
    const logout = el("button", null, "Logout");
    logout.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" }).catch(() => {});
      renderAccount();
    });
    accountEl.append(el("span", null, email), logout);
  } else {
    const login = el("a", null, "Login");
    login.href = "index.html";
    accountEl.append(login);
  }
}

searchEl.addEventListener("input", renderProducts);

(async () => {
  searchEl.value = new URLSearchParams(location.search).get("q") || "";
  renderAccount();
  try {
    const res = await fetch("/api/products");
    products = await res.json();
    loadCart();
    renderProducts();
    renderCart();
  } catch {
    show("Could not load products.", "err");
  }
})();
