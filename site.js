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

// Direct file downloads (Cursor-style): never send users to a GitHub page.
// Asset URLs force a file download; no source code or release notes are shown.
const DOWNLOAD_BASE =
  "https://github.com/Meet090201vora/ghostapply-releases/releases/latest/download";
const RELEASES_API =
  "https://api.github.com/repos/Meet090201vora/ghostapply-releases/releases/latest";

function setDownload(el, url, filename) {
  if (!el || !url) return;
  el.href = url;
  el.setAttribute("download", filename || "");
  el.removeAttribute("target");
}

async function wireDownloadLinks() {
  const win = document.querySelector("#dl-windows");
  const mac = document.querySelector("#dl-mac");
  const linux = document.querySelector("#dl-linux");
  if (!win && !mac && !linux) return;

  // Safe defaults: /latest/download/<name> redirects to the file itself.
  setDownload(win, `${DOWNLOAD_BASE}/GhostApply_0.2.1_x64-setup.exe`, "GhostApply_0.2.1_x64-setup.exe");
  setDownload(mac, `${DOWNLOAD_BASE}/GhostApply_0.2.1_universal.dmg`, "GhostApply_0.2.1_universal.dmg");
  setDownload(linux, `${DOWNLOAD_BASE}/GhostApply_0.2.1_amd64.AppImage`, "GhostApply_0.2.1_amd64.AppImage");

  try {
    const response = await fetch(RELEASES_API);
    if (!response.ok) throw new Error(response.statusText);
    const release = await response.json();
    const assets = release.assets || [];
    const pick = (test) => assets.find((a) => test(a.name.toLowerCase()));
    // Installers only — never wire engine.zip or source archives.
    const winAsset = pick((n) => n.endsWith("-setup.exe") || (n.endsWith(".exe") && !n.includes("engine")));
    const macAsset = pick((n) => n.endsWith(".dmg"));
    const linuxAsset = pick((n) => n.endsWith(".appimage"));
    if (winAsset) setDownload(win, winAsset.browser_download_url, winAsset.name);
    if (macAsset) setDownload(mac, macAsset.browser_download_url, macAsset.name);
    if (linuxAsset) setDownload(linux, linuxAsset.browser_download_url, linuxAsset.name);
    const version = (release.tag_name || "").replace(/^v/, "");
    const fine = document.querySelector("#dl-version");
    if (fine && version) {
      fine.textContent = `Version ${version} · Early Access`;
    }
  } catch {
    // Defaults above already point at the installer files.
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
