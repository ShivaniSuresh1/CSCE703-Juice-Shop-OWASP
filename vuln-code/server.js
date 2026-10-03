// VULNERABLE server
const express = require("express");
const alasql = require("alasql");        
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname))); 

// Passwords are stored in plain text
alasql("CREATE TABLE users (email STRING, password STRING)");
alasql("INSERT INTO users VALUES ('admin@juice.sh','admin123')");

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  // No server-side validation
  // VULNERABLE: user input is concatenated straight into the SQL string
  const query =
    "SELECT * FROM users WHERE email = '" + email +
    "' AND password = '" + password + "'";
  console.log("Executing:", query);

  let rows = [];
  try { rows = alasql(query); } catch (err) { rows = []; }

  // Echoes the raw email back
  if (rows.length > 0) {
    res.setHeader("Set-Cookie", "user=" + encodeURIComponent(email) + "; Path=/");
    return res.json({ message: "Welcome back, " + email + "!" });
  }
  return res.status(401).json({ message: "No account found for " + email });
});

// --- Shop ---
const products = [
  { id: 1, name: "Apple Juice",       price: 1.99, description: "Crisp, fresh-pressed apples." },
  { id: 2, name: "Orange Juice",      price: 2.99, description: "Sunny and full of vitamin C." },
  { id: 3, name: "Banana Smoothie",   price: 3.49, description: "Creamy banana blended smooth." },
  { id: 4, name: "Strawberry Juice",  price: 3.99, description: "Sweet summer strawberries." },
  { id: 5, name: "Watermelon Cooler", price: 2.49, description: "Light and refreshing." },
  { id: 6, name: "Green Detox",       price: 4.49, description: "Kale, cucumber and green apple." }
];

app.get("/api/products", (req, res) => res.json(products));

app.post("/api/checkout", (req, res) => {
  const items = (req.body && req.body.items) || [];

  let total = 0;
  for (const item of items) total += item.price * item.qty;
  res.json({ message: "Order placed! Total charged: $" + total.toFixed(2), total });
});

app.listen(3001, () => console.log("VULNERABLE app on http://localhost:3001"));
