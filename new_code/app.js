const form = document.getElementById("loginForm");
const msg  = document.getElementById("msg");

// FIX 1 - client-side validation
function validate(email, password) {
  if (!email || !password) return "Both fields are required.";
  if (!email.includes("@"))  return "Email must contain '@'.";
  if (password.length < 8)   return "Password must be at least 8 characters.";
  return null;
}

// FIX 2 - textContent instead of innerHTML so that injected markup is shown as text, not executed.
function show(text, cls) {
  msg.textContent = text;
  msg.className = "msg " + cls;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const error = validate(email, password);
  if (error) { show(error, "err"); return; }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    show(data.message, res.ok ? "ok" : "err");
    if (res.ok) setTimeout(() => { window.location.href = "shop.html"; }, 800);
  } catch {
    show("Could not reach server.", "err");
  }
});
