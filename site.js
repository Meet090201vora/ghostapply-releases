const pages = [
  ["index.html", "Home"],
  ["product.html", "Product"],
  ["pricing.html", "Pricing"],
  ["download.html", "Download"],
  ["about.html", "About"],
  ["contact.html", "Contact"],
];

function currentFile() {
  const name = location.pathname.split("/").pop();
  return name && name.endsWith(".html") ? name : "index.html";
}

function headerHTML() {
  const here = currentFile();
  const links = pages
    .map(([href, label]) => {
      const current = href === here ? ' aria-current="page"' : "";
      return `<a href="${href}"${current}>${label}</a>`;
    })
    .join("");
  return `
    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="index.html"><img src="assets/logo.png" alt="" />GhostApply</a>
        <button class="nav-toggle" type="button" aria-label="Menu">Menu</button>
        <nav class="nav">
          ${links}
          <a class="btn btn-primary" href="download.html">Get the app</a>
        </nav>
      </div>
    </header>`;
}

function footerHTML() {
  return `
    <footer class="site-footer">
      <div class="wrap">
        <div>
          <a class="brand" href="index.html"><img src="assets/logo.png" alt="" />GhostApply</a>
          <p>Quiet applications. A desktop engine that applies from your PC — you stay in the loop.</p>
        </div>
        <div>
          <strong>Product</strong>
          <a href="product.html">How it works</a><br />
          <a href="download.html">Download</a><br />
          <a href="pricing.html">Pricing &amp; billing</a>
        </div>
        <div>
          <strong>Company</strong>
          <a href="about.html">About</a><br />
          <a href="contact.html">Contact</a>
        </div>
        <div>
          <strong>Legal</strong>
          <a href="privacy.html">Privacy</a><br />
          <a href="terms.html">Terms</a><br />
          <span>© ${new Date().getFullYear()} GhostApply</span>
        </div>
      </div>
    </footer>`;
}

document.getElementById("site-header").outerHTML = headerHTML();
document.getElementById("site-footer").outerHTML = footerHTML();

// Point the download buttons at the newest installers on GitHub Releases.
// If the API call fails (rate limit, offline), the buttons keep their default
// href — the releases page — so downloads always work.
const RELEASES_API = "https://api.github.com/repos/Meet090201vora/ghostapply-releases/releases/latest";

async function wireDownloadLinks() {
  const win = document.querySelector("#dl-windows");
  const mac = document.querySelector("#dl-mac");
  if (!win && !mac) return;
  try {
    const response = await fetch(RELEASES_API);
    if (!response.ok) throw new Error(response.statusText);
    const release = await response.json();
    const assets = release.assets || [];
    const find = (ext) => assets.find((a) => a.name.toLowerCase().endsWith(ext));
    const winAsset = find(".exe");
    const macAsset = find(".dmg");
    if (win && winAsset) win.href = winAsset.browser_download_url;
    if (mac && macAsset) mac.href = macAsset.browser_download_url;
    const version = (release.tag_name || "").replace(/^v/, "");
    const fine = document.querySelector("#dl-version");
    if (fine && version) {
      fine.textContent = `Version ${version} · Early Access · downloads served from GitHub Releases.`;
    }
  } catch {
    // keep fallback links
  }
}
wireDownloadLinks();

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => nav.classList.toggle("open"));

const form = document.querySelector("#checkout-form");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const box = document.querySelector("#checkout-status");
    box.className = "notice ok";
    box.textContent =
      "Got it. Card checkout is not live on this preview yet — we will email this address a GA1 license key after payment is connected. Keep this tab: you can still download the Windows app now.";
  });
}

const contact = document.querySelector("#contact-form");
if (contact) {
  contact.addEventListener("submit", (event) => {
    event.preventDefault();
    const box = document.querySelector("#contact-status");
    box.className = "notice ok";
    box.textContent = "Message saved on this preview. Wire this form to your email or helpdesk before launch.";
  });
}
