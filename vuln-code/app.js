const form = document.getElementById("loginForm");
const msg  = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  // No client-side validation at all: empty, short, or malicious input all pass.
  // VULNERABLE: input is written as HTML via innerHTML. 
  msg.innerHTML = "Attempting login for: " + email;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  // VULNERABLE again: the server echoes the email back, rendered as HTML.
  msg.innerHTML = data.message;
  if (res.ok) setTimeout(() => { window.location.href = "shop.html"; }, 800);
});
