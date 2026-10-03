// SECURE server 
const express = require("express");
const alasql = require("alasql");
const bcrypt = require("bcryptjs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// FIX 3 - passwords stored only as bcrypt hashes not plaintext.
alasql("CREATE TABLE users (email STRING, pass_hash STRING)");
const seedHash = bcrypt.hashSync("Sup3rSecret!", 12);
alasql("INSERT INTO users VALUES (?,?)", ["admin@juice.sh", seedHash]);

// FIX 7 - server-side sessions: random unguessable id in an HttpOnly cookie.
const SESSION_MS = 60 * 60 * 1000;
const sessions = new Map(); // sid -> { email, expires }

function getSession(req) {
  const match = /(?:^|;\s*)sid=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "");
  const session = match && sessions.get(match[1]);
  if (!session) return null;
  if (session.expires < Date.now()) { sessions.delete(match[1]); return null; }
  return { sid: match[1], ...session };
}

// HttpOnly: JS can't read it (XSS can't steal it). SameSite=Strict: other sites can't send it (CSRF).
// Add "; Secure" when served over HTTPS.
function setSessionCookie(res, sid, maxAgeSec) {
  res.setHeader("Set-Cookie",
    `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`);
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};

  // FIX 4 - server-side validation 
  if (typeof email !== "string" || typeof password !== "string")
    return res.status(400).json({ message: "Invalid input." });
  if (!email.includes("@") || password.length < 8)
    return res.status(400).json({ message: "Validation failed on server." });

  // FIX 5 - parameterized query: '?' binds email as DATA, so " ' OR '1'='1 " is treated as a literal string.
  const rows = alasql("SELECT pass_hash FROM users WHERE email = ?", [email]);

  // FIX 6 - verify password against the stored bcrypt hash.
  if (rows.length > 0 && bcrypt.compareSync(password, rows[0].pass_hash)) {
    const old = getSession(req);
    if (old) sessions.delete(old.sid); // fresh id on every login (no session fixation)
    const sid = crypto.randomBytes(32).toString("hex");
    sessions.set(sid, { email, expires: Date.now() + SESSION_MS });
    setSessionCookie(res, sid, SESSION_MS / 1000);
    return res.json({ message: "Login successful." });
  }

  // Never echoes input (no XSS feed) and doesn't reveal if the email exists.
  return res.status(401).json({ message: "Invalid email or password." });
});

app.get("/api/me", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: "Not logged in." });
  res.json({ email: session.email });
});

app.post("/api/logout", (req, res) => {
  const session = getSession(req);
  if (session) sessions.delete(session.sid);
  setSessionCookie(res, "", 0);
  res.json({ message: "Logged out." });
});

// --- Shop ---
const products = [
  { id: 1, name: "Apple Juice",       emoji: "🍎", price: 1.99, description: "Crisp, fresh-pressed apples." },
  { id: 2, name: "Orange Juice",      emoji: "🍊", price: 2.99, description: "Sunny and full of vitamin C." },
  { id: 3, name: "Banana Smoothie",   emoji: "🍌", price: 3.49, description: "Creamy banana blended smooth." },
  { id: 4, name: "Strawberry Juice",  emoji: "🍓", price: 3.99, description: "Sweet summer strawberries." },
  { id: 5, name: "Watermelon Cooler", emoji: "🍉", price: 2.49, description: "Light and refreshing." },
  { id: 6, name: "Green Detox",       emoji: "🥬", price: 4.49, description: "Kale, cucumber and green apple." }
];

app.get("/api/products", (req, res) => res.json(products));

app.post("/api/checkout", (req, res) => {
  // FIX 8 - checkout is enforced on the server, not just hidden in the UI.
  if (!getSession(req))
    return res.status(401).json({ message: "Please log in to check out." });

  const items = req.body && req.body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50)
    return res.status(400).json({ message: "Cart is empty or invalid." });

  // Prices come from the server's catalogue, never from the client.
  let total = 0;
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 10)
      return res.status(400).json({ message: "Invalid item in cart." });
    total += product.price * item.qty;
  }
  res.json({ message: "Order placed.", total: Math.round(total * 100) / 100 });
});

app.listen(3000, () => console.log("SECURE app on http://localhost:3000"));
