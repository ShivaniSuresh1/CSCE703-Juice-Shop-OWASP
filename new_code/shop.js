const productsEl = document.getElementById("products");
const cartEl     = document.getElementById("cartItems");
const totalEl    = document.getElementById("cartTotal");
const checkoutEl = document.getElementById("checkout");
const msg        = document.getElementById("msg");
const accountEl  = document.getElementById("account");
const searchEl   = document.getElementById("search");
const searchInfo = document.getElementById("searchInfo");

let products = [];
let cart = {}; // product id -> quantity

// Keep the cart in localStorage so it is still there after logging in.
function saveCart() {
  try { localStorage.setItem("cart", JSON.stringify(cart)); } catch {}
}
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("cart") || "{}");
    for (const p of products) {
      const qty = saved[p.id];
      if (Number.isInteger(qty) && qty > 0) cart[p.id] = Math.min(qty, 10);
    }
  } catch {}
}

function money(n) {
  return "$" + n.toFixed(2);
}

function show(text, cls) {
  msg.textContent = text;
  msg.className = "msg " + cls;
}

// All text below is set with textContent, never innerHTML.
function cell(text, cls) {
  const td = document.createElement("td");
  td.textContent = text;
  if (cls) td.className = cls;
  return td;
}

function renderProducts() {
  const query = searchEl.value.trim();
  const list = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  // FIX 9 - search term shown with textContent, so markup in it is not executed.
  searchInfo.textContent = query ? 'Results for "' + query + '": ' + list.length : "";

  productsEl.textContent = "";
  for (const p of list) {
    const btn = document.createElement("button");
    btn.textContent = "Add";
    btn.addEventListener("click", () => changeQty(p.id, 1));

    const tr = document.createElement("tr");
    tr.append(cell(p.name), cell(p.description, "desc"), cell(money(p.price), "price"));
    const td = document.createElement("td");
    td.append(btn);
    tr.append(td);
    productsEl.append(tr);
  }
}

function renderCart() {
  cartEl.textContent = "";
  let total = 0;
  for (const p of products) {
    const qty = cart[p.id];
    if (!qty) continue;
    total += p.price * qty;

    const minus = document.createElement("button");
    minus.textContent = "-";
    minus.addEventListener("click", () => changeQty(p.id, -1));
    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.addEventListener("click", () => changeQty(p.id, 1));

    const name = document.createElement("span");
    name.textContent = p.name;
    const qtyBox = document.createElement("span");
    qtyBox.append(minus, qty, plus);

    const li = document.createElement("li");
    li.append(name, qtyBox);
    cartEl.append(li);
  }
  const empty = Object.keys(cart).length === 0;
  if (empty) {
    const li = document.createElement("li");
    li.textContent = "Cart is empty.";
    cartEl.append(li);
  }
  totalEl.textContent = money(total);
  checkoutEl.disabled = empty;
}

function changeQty(id, change) {
  const qty = (cart[id] || 0) + change;
  if (qty <= 0) delete cart[id];
  else cart[id] = Math.min(qty, 10);
  saveCart();
  show("", "");
  renderCart();
}

checkoutEl.addEventListener("click", async () => {
  // Only ids and quantities are sent. The server looks up the prices itself.
  const items = Object.keys(cart).map(id => ({ id: Number(id), qty: cart[id] }));
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (res.ok) {
      cart = {};
      saveCart();
      renderCart();
      show("Order placed. Total charged: " + money(data.total), "ok");
    } else if (res.status === 401) {
      show("Please log in to check out.", "err");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } else {
      show(data.message, "err");
    }
  } catch {
    show("Could not reach server.", "err");
  }
});

async function renderAccount() {
  accountEl.textContent = "";
  let res = null;
  try { res = await fetch("/api/me"); } catch {}

  if (res && res.ok) {
    const data = await res.json();
    const logout = document.createElement("button");
    logout.textContent = "Logout";
    logout.addEventListener("click", async () => {
      try { await fetch("/api/logout", { method: "POST" }); } catch {}
      renderAccount();
    });
    accountEl.append("Logged in as " + data.email, logout);
  } else {
    const login = document.createElement("a");
    login.href = "index.html";
    login.textContent = "Login";
    accountEl.append(login);
  }
}

searchEl.addEventListener("input", renderProducts);

async function start() {
  searchEl.value = new URLSearchParams(location.search).get("q") || "";
  renderAccount();
  try {
    const res = await fetch("/api/products");
    products = await res.json();
  } catch {
    show("Could not load products. Start the server with npm start.", "err");
    return;
  }
  loadCart();
  renderProducts();
  renderCart();
}

start();
