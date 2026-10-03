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

const money = (n) => "$" + n.toFixed(2);

// "Session" is just the email in a normal cookie that JavaScript can read and write.
function currentUser() {
  const match = /(?:^|;\s*)user=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : null;
}

function saveCart() {
  try { localStorage.setItem("cart", JSON.stringify([...cart])); } catch {}
}
function loadCart() {
  try { for (const [id, qty] of JSON.parse(localStorage.getItem("cart") || "[]")) cart.set(id, qty); } catch {}
}

function renderProducts() {
  const query = searchEl.value;
  const matches = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()));

  // VULNERABLE: the search term is written as HTML, so <img src=x onerror=...> runs.
  searchInfo.innerHTML = query ? "Results for " + query + ": " + matches.length : "";

  productsEl.innerHTML = matches.map((p) => `
    <div class="card">
      <div class="emoji">${p.emoji}</div>
      <div class="name">${p.name}</div>
      <div class="desc">${p.description}</div>
      <div class="price">${money(p.price)}</div>
      <button data-id="${p.id}">Add to cart</button>
    </div>`).join("");
  for (const btn of productsEl.querySelectorAll("button"))
    btn.addEventListener("click", () => changeQty(Number(btn.dataset.id), 1));
}

function renderCart() {
  let total = 0;
  cartEl.innerHTML = "";
  for (const [id, qty] of cart) {
    const p = products.find((x) => x.id === id);
    if (!p) continue;
    total += p.price * qty;
    const li = document.createElement("li");
    li.innerHTML = `<span>${p.name}</span><span class="qty">
      <button data-d="-1">−</button><span>${qty}</span><button data-d="1">+</button></span>`;
    for (const b of li.querySelectorAll("button"))
      b.addEventListener("click", () => changeQty(id, Number(b.dataset.d)));
    cartEl.append(li);
  }
  if (cart.size === 0) cartEl.innerHTML = "<li>Cart is empty.</li>";
  totalEl.textContent = money(total);
  checkoutEl.disabled = cart.size === 0;
}

function changeQty(id, delta) {
  const qty = (cart.get(id) || 0) + delta;
  if (qty <= 0) cart.delete(id); else cart.set(id, qty);
  saveCart();
  msg.innerHTML = "";
  renderCart();
}

checkoutEl.addEventListener("click", async () => {
  // VULNERABLE: the login check only happens here in the browser.
  if (!currentUser()) {
    msg.innerHTML = '<span class="err">Please log in to check out. Redirecting…</span>';
    setTimeout(() => { window.location.href = "index.html"; }, 1000);
    return;
  }

  // VULNERABLE: the client sends the prices and the server trusts them.
  const items = [...cart].map(([id, qty]) => {
    const p = products.find((x) => x.id === id);
    return { id, name: p.name, price: p.price, qty };
  });
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (res.ok) { cart.clear(); saveCart(); renderCart(); }
  msg.innerHTML = `<span class="${res.ok ? "ok" : "err"}">${data.message}</span>`;
});

function renderAccount() {
  const user = currentUser();
  if (user) {
    // VULNERABLE: the cookie value is written as HTML.
    accountEl.innerHTML = `<span>${user}</span><button id="logout">Logout</button>`;
    document.getElementById("logout").addEventListener("click", () => {
      document.cookie = "user=; Path=/; Max-Age=0";
      renderAccount();
    });
  } else {
    accountEl.innerHTML = '<a href="index.html">Login</a>';
  }
}

searchEl.addEventListener("input", renderProducts);

(async () => {
  searchEl.value = new URLSearchParams(location.search).get("q") || "";
  renderAccount();
  const res = await fetch("/api/products");
  products = await res.json();
  loadCart();
  renderProducts();
  renderCart();
})();
