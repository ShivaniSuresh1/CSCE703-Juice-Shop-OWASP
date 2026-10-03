# Juice Shop–Style Login: Before & After Fixing Vulnerabilities

A login page inspired by [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/),
built for a web-security assignment. It ships in two versions so you can see the
same feature before and after hardening:

| Folder       | Port | What it shows |
|--------------|------|----------------|
| `vuln-code/` | 3001 | SQL Injection and XSS both **succeed** |
| `new_code/`  | 3000 | The same attacks are **blocked** |

## The vulnerabilities (in `vuln-code/`)
1. **SQL Injection** - the server concatenates input into the SQL string, so
   `admin@juice.sh' OR '1'='1` logs you in with no valid password.
2. **Cross-Site Scripting (XSS)** - the page renders your input with `innerHTML`,
   so an email like `<img src=x onerror=alert('XSS')>` executes JavaScript.
3. **Weak auth handling** - passwords stored in plaintext, no input validation.

## The fixes (in `new_code/`)
1. **Parameterized query** (`WHERE email = ?`) - input is treated as data, not SQL.
2. **`textContent` instead of `innerHTML`** + a **Content-Security-Policy** header -
   injected markup is shown as inert text and inline scripts are blocked.
3. **bcrypt password hashing** (12 salt rounds) and **server-side validation** that
   re-checks every rule the client does.

## Demo account (secure version)
- Email: `admin@juice.sh`
- Password: `Sup3rSecret!`

(The vulnerable version's seeded password is the plaintext `admin123`.)
<img width="1277" height="465" alt="image" src="https://github.com/user-attachments/assets/0c4665d2-f646-43b2-9205-0e4ab9b0b441" />


## How to run
```bash
git clone https://github.com/ShivaniSuresh1/CSCE703-Juice-Shop-OWASP.git
cd CSCE703-Juice-Shop-OWASP

cd vuln-code && npm install && npm start   # vulnerable demo in http://localhost:3001
cd new_code  && npm install && npm start   # secure version in http://localhost:3000
```
Run each version from the repo root in its own terminal, then open the printed URL
in your browser. Dependencies are pure JavaScript (`express`, `bcryptjs`, `alasql`),
so `npm install` needs no build tools.

## Try the attacks yourself
Against **http://localhost:3001** (vulnerable):
- SQLi - Email: `admin@juice.sh' OR '1'='1`  Password: `x' OR '1'='1` → logs in.
- XSS  - Email: `<img src=x onerror=alert('XSS')>`  Password: anything → alert pops.

Run the identical inputs against **http://localhost:3000** (secure) and both fail.

## Project structure
```
CSCE703-Juice-Shop-OWASP/
├─ vuln-code/   index.html  app.js  server.js  shop.html  shop.js   # before
├─ new_code/    index.html  app.js  server.js  shop.html  shop.js   # after
└─ README.md
```

## License
MIT
