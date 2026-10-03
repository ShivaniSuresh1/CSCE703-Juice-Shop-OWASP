# CSCE 703 Juice Shop-Style Login & Shop: Before & After Fixing Vulnerabilities

A small login page and juice shop inspired by
[OWASP Juice Shop](https://owasp.org/www-project-juice-shop/), built with plain
HTML/JavaScript on the front end and a Node.js/Express back end. The same
features are provided in **two versions** so the attacks and their fixes can be
compared side by side:

| Folder       | Version    | URL                     | What happens |
|--------------|------------|-------------------------|--------------|
| `vuln-code/` | Vulnerable | http://localhost:3001   | SQL Injection, XSS, price tampering and checkout without login **succeed** |
| `new_code/`  | Secure     | http://localhost:3000   | The same attacks are **blocked** |

Each folder is a self-contained app with five files:

- `index.html` – the login form
- `app.js` – client-side JavaScript that submits the form to `/api/login` and
  goes to the shop on success
- `shop.html` – the juice shop: product search, cart and checkout
- `shop.js` – client-side JavaScript for the shop
- `server.js` – Express server with an in-memory user table ([AlaSQL](https://github.com/AlaSQL/alasql)),
  the product catalogue and the login, session and checkout APIs

## The shop

After logging in you are taken to `shop.html`. You can also open it as a guest
from the link under the login form.

- Six juices to browse, with a search box (also works as `shop.html?q=apple`)
- A cart with +/- quantity buttons and a running total; the cart is kept in the
  browser, so it survives going to the login page and back
- **Checkout requires login** – guests are sent to the login page and come back
  to the shop with their cart intact
- The header shows the logged-in email and a Logout button

## How to run

**Prerequisite:** [Node.js](https://nodejs.org/) 18 or newer (includes `npm`).

```bash
git clone https://github.com/ShivaniSuresh1/CSCE703-Juice-Shop-OWASP.git
cd CSCE703-Juice-Shop-OWASP
```

**Vulnerable version** (port 3001):

```bash
cd vuln-code
npm install
node server.js
```

**Secure version** (port 3000), in a second terminal:

```bash
cd new_code
npm install
node server.js
```

Open the URL printed in each terminal in your browser. Both can run at the same
time because they use different ports. Stop a server with `Ctrl+C`.

Dependencies (`express`, `bcryptjs`, `alasql`) are pure JavaScript, so
`npm install` needs no build tools.

> Open the pages through the Node server (`http://localhost:...`), not by
> double-clicking `index.html`. The form posts to `/api/login`, which only
> exists when `server.js` is running.

## Demo accounts

| Version    | Email            | Password       |
|------------|------------------|----------------|
| Vulnerable | `admin@juice.sh` | `admin123`     |
| Secure     | `admin@juice.sh` | `Sup3rSecret!` |

## Try the attacks

### Login

Enter these in the login form of each version:

| Attack        | Email                               | Password          | Vulnerable (3001) | Secure (3000) |
|---------------|-------------------------------------|-------------------|-------------------|---------------|
| SQL Injection | `admin@juice.sh' OR '1'='1`         | `x' OR '1'='1`    | Logs in without the password | "Invalid email or password." |
| XSS           | `<img src=x onerror=alert('XSS')>`  | anything          | JavaScript alert pops up | Rejected by validation; no script runs |

### Shop

| Attack | How | Vulnerable (3001) | Secure (3000) |
|--------|-----|-------------------|---------------|
| XSS in search | Type `<img src=x onerror=alert('XSS')>` in the search box, or open `shop.html?q=<img src=x onerror=alert('XSS')>` | Alert pops up | Shown as plain text; no script runs |
| Checkout without login | Run the `curl` command below without logging in | Order placed | `401` "Please log in to check out." |
| Forged login cookie | In the browser console on the shop page: `document.cookie = "user=anyone@evil.com"`, then reload | Shown as logged in as `anyone@evil.com` and can check out | Session cookie is `HttpOnly` and random; a made-up value is rejected |
| Price tampering | Send a checkout with your own price (below) | Charged `$0.10` for 10 × Green Detox | Price ignored; charged the real `$44.90` (when logged in) |
| Negative quantity | Same, with `"qty": -5` | Charged a negative total (`$-9.95`) | `400` "Invalid item in cart." |

Price tampering and checkout without login (no cookie is sent, so this is a
guest):

```bash
# Vulnerable: order placed for $0.10
curl -X POST http://localhost:3001/api/checkout -H "Content-Type: application/json" \
  -d '{"items":[{"id":6,"name":"Green Detox","price":0.01,"qty":10}]}'

# Secure: 401 Please log in to check out.
curl -X POST http://localhost:3000/api/checkout -H "Content-Type: application/json" \
  -d '{"items":[{"id":6,"price":0.01,"qty":10}]}'
```

On Windows, run these in Git Bash, or in PowerShell use `curl.exe`, put the
command on one line and escape the inner quotes.

## Vulnerabilities (`vuln-code/`)

1. **SQL Injection** – `server.js` builds the query by concatenating user input
   into the SQL string, so `' OR '1'='1` changes the query's logic and bypasses
   the password check.
2. **Cross-Site Scripting (XSS)** – `app.js` writes the email (and the server's
   echoed message) into the page with `innerHTML`, so injected HTML/JavaScript
   runs. There is no Content-Security-Policy to stop it.
3. **Weak authentication handling** – passwords are stored in plaintext, there
   is no client- or server-side input validation, and error messages reveal
   whether an email exists.
4. **XSS in shop search** – `shop.js` writes the search term into the page with
   `innerHTML`, so a link like `shop.html?q=<img src=x onerror=...>` runs
   script for anyone who opens it.
5. **Broken access control** – the login check for checkout happens only in the
   browser. `/api/checkout` itself accepts orders from anyone.
6. **Forgeable session** – the "session" is the plain email in a `user` cookie
   without `HttpOnly` or `SameSite`, so JavaScript (including injected XSS) can
   read it and anyone can set it to any email.
7. **Trusting client prices** – the browser sends each item's price and the
   server totals whatever it receives, so prices can be lowered and quantities
   made negative.

## Fixes (`new_code/`)

1. **Client-side validation** (`app.js`) – both fields required, email must
   contain `@`, password at least 8 characters.
2. **`textContent` instead of `innerHTML`** (`app.js`) – any markup in the input
   is displayed as inert text.
3. **Content-Security-Policy** (`index.html`) – `default-src 'self'` blocks
   inline and injected scripts as a second layer of XSS defence.
4. **Server-side validation** (`server.js`) – re-checks types and the same rules,
   since client-side checks can be bypassed.
5. **Parameterized query** (`server.js`) – `WHERE email = ?` binds input as data,
   so it can never change the SQL.
6. **bcrypt password hashing** (`server.js`) – passwords are stored only as
   bcrypt hashes (12 salt rounds) and checked with `bcrypt.compareSync`.
7. **Generic error message** – the server returns "Invalid email or password."
   and never echoes user input back.
8. **Server-side sessions** (`server.js`) – each login creates a random 256-bit
   session id stored in an `HttpOnly; SameSite=Strict` cookie. Sessions expire
   after 1 hour, a new id is issued on every login, and Logout deletes the
   session on the server.
9. **Checkout requires login on the server** (`server.js`) – `/api/checkout`
   returns `401` without a valid session, whatever the browser does.
10. **Server-side prices** (`server.js`) – the browser sends only product ids and
    quantities; the server looks up prices in its own catalogue and accepts only
    known products with whole-number quantities from 1 to 10.
11. **`textContent` in the shop** (`shop.js`) – the search term, product names
    and account email are inserted as text, and the CSP in `shop.html` blocks
    injected scripts as a second layer.

> Sessions are kept in memory, so restarting the server logs everyone out. When
> serving over HTTPS, add `; Secure` to the cookie in `setSessionCookie`.

## Project structure

```
CSCE703-Juice-Shop-OWASP/
├── vuln-code/          # BEFORE – vulnerable version (port 3001)
│   ├── index.html
│   ├── app.js
│   ├── shop.html
│   ├── shop.js
│   ├── server.js
│   └── package.json
├── new_code/           # AFTER – secure version (port 3000)
│   ├── index.html
│   ├── app.js
│   ├── shop.html
│   ├── shop.js
│   ├── server.js
│   └── package.json
└── README.md
```

## Disclaimer

`vuln-code/` is intentionally insecure and exists for educational purposes only.
Run it locally and do not deploy it.
