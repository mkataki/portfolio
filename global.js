console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let nav = document.createElement('nav');
document.body.prepend(nav);

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "https://github.com/mkataki", title: "GitHub Profile", external: true },
];


const ARE_WE_HOME = document.documentElement.classList.contains('home');


for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !ARE_WE_HOME && !p.external ? `../${url}` : url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  if (p.external) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }

  nav.append(a);
}

// Insert the theme switcher at the top
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-switcher">
      <option value="auto">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

// Reference to the theme dropdown
const select = document.getElementById("theme-switcher");

function applyColorScheme(scheme) {
  if (scheme === "auto") {
    document.documentElement.style.removeProperty("color-scheme"); 
  } else {
    document.documentElement.style.setProperty("color-scheme", scheme); 
  }
}

select.addEventListener("input", function (event) {
  const selectedScheme = event.target.value;

  applyColorScheme(selectedScheme);

  localStorage.setItem("colorScheme", selectedScheme);
});


const savedScheme = localStorage.getItem("colorScheme") || "auto";
applyColorScheme(savedScheme);

select.value = savedScheme;

if (savedScheme === "auto") {
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");

  prefersDarkMode.addEventListener("change", () => {
    applyColorScheme("auto");
  });
}
