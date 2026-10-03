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

function saveCart() {
  try { localStorage.setItem("cart", JSON.stringify(cart)); } catch {}
}
function loadCart() {
  try { cart = JSON.parse(localStorage.getItem("cart") || "{}"); } catch {}
}

function money(n) {
  return "$" + n.toFixed(2);
}

// The "session" is just the email in a normal cookie that JavaScript can read and change.
function currentUser() {
  const match = /(?:^|;\s*)user=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function renderProducts() {
  const query = searchEl.value;
  const list = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  // VULNERABLE: search term is written as HTML, so <img src=x onerror=...> runs.
  searchInfo.innerHTML = query ? "Results for " + query + ": " + list.length : "";

  let rows = "";
  for (const p of list) {
    rows += "<tr><td>" + p.name + "</td><td class='desc'>" + p.description +
            "</td><td class='price'>" + money(p.price) +
            "</td><td><button data-id='" + p.id + "'>Add</button></td></tr>";
  }
  productsEl.innerHTML = rows;
  for (const btn of productsEl.querySelectorAll("button")) {
    btn.addEventListener("click", () => changeQty(Number(btn.dataset.id), 1));
  }
}

function renderCart() {
  let html = "";
  let total = 0;
  for (const p of products) {
    const qty = cart[p.id];
    if (!qty) continue;
    total += p.price * qty;
    html += "<li><span>" + p.name + "</span><span>" +
            "<button data-id='" + p.id + "' data-change='-1'>-</button>" + qty +
            "<button data-id='" + p.id + "' data-change='1'>+</button></span></li>";
  }
  cartEl.innerHTML = html || "<li>Cart is empty.</li>";
  for (const btn of cartEl.querySelectorAll("button")) {
    btn.addEventListener("click", () =>
      changeQty(Number(btn.dataset.id), Number(btn.dataset.change)));
  }
  totalEl.textContent = money(total);
  checkoutEl.disabled = html === "";
}

function changeQty(id, change) {
  const qty = (cart[id] || 0) + change;
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart();
  msg.innerHTML = "";
  renderCart();
}

checkoutEl.addEventListener("click", async () => {
  // VULNERABLE: the login check only happens here in the browser.
  if (!currentUser()) {
    msg.innerHTML = "<span class='err'>Please log in to check out.</span>";
    setTimeout(() => { window.location.href = "index.html"; }, 1000);
    return;
  }

  // VULNERABLE: the browser sends the prices and the server trusts them.
  const items = [];
  for (const p of products) {
    if (cart[p.id]) items.push({ id: p.id, name: p.name, price: p.price, qty: cart[p.id] });
  }
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
  }
  msg.innerHTML = "<span class='" + (res.ok ? "ok" : "err") + "'>" + data.message + "</span>";
});

function renderAccount() {
  const user = currentUser();
  if (user) {
    // VULNERABLE: cookie value is written as HTML.
    accountEl.innerHTML = "Logged in as " + user + " <button id='logout'>Logout</button>";
    document.getElementById("logout").addEventListener("click", () => {
      document.cookie = "user=; Path=/; Max-Age=0";
      renderAccount();
    });
  } else {
    accountEl.innerHTML = "<a href='index.html'>Login</a>";
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
    msg.innerHTML = "<span class='err'>Could not load products. Start the server with npm start.</span>";
    return;
  }
  loadCart();
  renderProducts();
  renderCart();
}

start();
