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
          <a class="btn btn-primary" href="apply.html">Request access</a>
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
          <a href="apply.html">Request access</a><br />
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

// Direct file downloads (Cursor-style). Every release publishes latest.json next to this
// site with the exact installer URLs, so the buttons always point at the newest build.
// Fallbacks: the GitHub API (rate-limited), then the release page (never a dead link).
const RELEASES_REPO = "Meet090201vora/ghostapply-releases";
const RELEASES_PAGE = `https://github.com/${RELEASES_REPO}/releases/latest`;
const RELEASES_API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;
const MANIFEST_URLS = [
  "latest.json",
  "https://meet090201vora.github.io/ghostapply-releases/latest.json",
];

function setDownload(el, url, filename) {
  if (!el || !url) return;
  el.href = url;
  if (filename) el.setAttribute("download", filename);
  else el.removeAttribute("download");
  el.removeAttribute("target");
}

async function fetchJSON(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

// Installer names follow Tauri's pattern, so a manifest without a "downloads" block still works.
function installersFor(version) {
  const base = `https://github.com/${RELEASES_REPO}/releases/download/v${version}`;
  const files = {
    windows: `GhostApply_${version}_x64-setup.exe`,
    mac: `GhostApply_${version}_universal.dmg`,
    linux: `GhostApply_${version}_amd64.AppImage`,
  };
  return Object.fromEntries(
    Object.entries(files).map(([os, file]) => [os, { url: `${base}/${file}`, file }]),
  );
}

async function fromManifest() {
  for (const url of MANIFEST_URLS) {
    try {
      const manifest = await fetchJSON(url);
      const version = String(manifest.version || "").replace(/^v/, "");
      if (!version) continue;
      return {
        version,
        notes: manifest.notes || "",
        date: manifest.pub_date || "",
        downloads: manifest.downloads || null, // older manifests have no installer links
      };
    } catch {
      // try the next source
    }
  }
  return null;
}

async function fromReleasesApi() {
  const release = await fetchJSON(RELEASES_API);
  const assets = release.assets || [];
  const pick = (test) => {
    const asset = assets.find((a) => test(a.name.toLowerCase()));
    return asset ? { url: asset.browser_download_url, file: asset.name } : null;
  };
  return {
    version: String(release.tag_name || "").replace(/^v/, ""),
    notes: release.body || "",
    date: release.published_at || "",
    // Installers only — never the engine archives or updater bundles.
    downloads: {
      windows: pick((n) => n.endsWith("-setup.exe")),
      mac: pick((n) => n.endsWith(".dmg")),
      linux: pick((n) => n.endsWith(".appimage")),
    },
  };
}

function detectOS() {
  const ua = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""} ${navigator.userAgent}`.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(ua)) return ""; // phones: no desktop build to favor
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux") && !ua.includes("android")) return "linux";
  return "";
}

async function wireDownloadLinks() {
  const buttons = {
    windows: document.querySelector("#dl-windows"),
    mac: document.querySelector("#dl-mac"),
    linux: document.querySelector("#dl-linux"),
  };
  if (!buttons.windows && !buttons.mac && !buttons.linux) return;

  // Put this visitor's platform first.
  const os = detectOS();
  const mine = buttons[os];
  if (mine && mine.parentElement) {
    mine.parentElement.prepend(mine);
    mine.classList.add("btn-primary");
    mine.classList.remove("btn-ghost");
    if (os === "linux") mine.textContent = "Download for Linux";
  }

  // 1) the manifest's exact links, 2) the release's real assets, 3) names built from the version.
  let release = await fromManifest();
  if (!release || !release.downloads) {
    try {
      const api = await fromReleasesApi();
      release = { ...api, notes: (release && release.notes) || api.notes };
    } catch {
      if (!release) return; // buttons keep pointing at the release page
      release.downloads = installersFor(release.version);
    }
  }
  for (const [key, el] of Object.entries(buttons)) {
    const item = release.downloads && release.downloads[key];
    if (item && item.url) setDownload(el, item.url, item.file);
  }

  if (release.version) {
    const fine = document.querySelector("#dl-version");
    if (fine) {
      let when = "";
      const date = release.date ? new Date(release.date) : null;
      if (date && !Number.isNaN(date.getTime())) {
        when = ` · released ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
      }
      fine.textContent = `Version ${release.version}${when} · Early Access · updates itself`;
    }
    const notes = document.querySelector("#dl-notes");
    if (notes && release.notes) {
      document.querySelector("#dl-notes-title").textContent = `What’s new in ${release.version}`;
      document.querySelector("#dl-notes-body").textContent = release.notes;
      notes.hidden = false;
    }
  }
}
wireDownloadLinks();

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => nav.classList.toggle("open"));

const PLANS = {
  monthly: { line: "$12 / month", name: "GhostApply Pro — monthly", price: "$12" },
  pass: { line: "$29 / 3 months", name: "GhostApply Job Search Pass — 3 months", price: "$29" },
};
const planSelect = document.querySelector("#plan-select");
function showPlan(key) {
  const plan = PLANS[key] || PLANS.monthly;
  document.querySelector("#plan-line").textContent = plan.line;
  document.querySelector("#plan-name").textContent = plan.name;
  document.querySelector("#plan-price").textContent = plan.price;
}
if (planSelect) {
  const wanted = new URLSearchParams(location.search).get("plan");
  if (wanted && PLANS[wanted]) planSelect.value = wanted;
  showPlan(planSelect.value);
  planSelect.addEventListener("change", () => showPlan(planSelect.value));
}

const form = document.querySelector("#checkout-form");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const box = document.querySelector("#checkout-status");
    box.className = "notice ok";
    box.textContent =
      "Got it. Card checkout is not live on this preview yet — we will email this address a GA1 license key after payment is connected. Keep this tab: you can still download the app now.";
  });
}

// Request access form -> Google Apps Script (saves a row in your Sheet, emails the applicant).
const accessForm = document.querySelector("#access-form");
if (accessForm) {
  const status = document.querySelector("#access-status");
  const button = accessForm.querySelector(".access-submit");
  const buttonLabel = button.innerHTML;

  const say = (text, kind) => {
    status.hidden = !text;
    status.textContent = text || "";
    status.className = `notice${kind ? ` ${kind}` : ""}`;
  };
  const mark = (el, bad) => el && el.classList.toggle("invalid", bad);

  function validate() {
    let first = null;
    const flag = (el, bad) => { mark(el, bad); if (bad && !first) first = el; };
    for (const name of ["name", "email", "roles"]) {
      const input = accessForm.elements[name];
      flag(input, !input.value.trim() || (name === "email" && !input.checkValidity()));
    }
    const linkedin = accessForm.elements.linkedin;
    flag(linkedin, linkedin.value.trim() !== "" && !linkedin.checkValidity());
    const os = accessForm.querySelector("#os-group");
    flag(os, !accessForm.querySelector('input[name="os"]:checked'));
    const consent = accessForm.querySelector(".consent");
    flag(consent, !accessForm.elements.consent.checked);
    return first;
  }

  accessForm.addEventListener("input", (event) => {
    const el = event.target.closest(".invalid") || event.target;
    if (el.classList.contains("invalid")) mark(el, false);
    const group = event.target.closest(".chip-group, .consent");
    if (group) mark(group, false);
  });

  accessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    say("");
    const bad = validate();
    if (bad) {
      say("Please fill in the highlighted fields.", "err");
      (bad.querySelector ? bad.querySelector("input") || bad : bad).focus?.();
      return;
    }
    const endpoint = accessForm.dataset.endpoint || "";
    if (!endpoint.startsWith("https://")) {
      say("Requests aren't connected yet. Email us from the Contact page and we'll add you by hand.", "err");
      return;
    }

    const form = new FormData(accessForm);
    const payload = Object.fromEntries(
      [...new Set(form.keys())].map((key) => {
        const values = form.getAll(key).map((v) => String(v).trim());
        return [key, key === "boards" ? values : values[0] || ""];
      }),
    );
    payload.page = location.href;
    payload.userAgent = navigator.userAgent;

    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>Sending…';
    try {
      // text/plain keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer.
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Something went wrong.");
      document.querySelector("#access-name").textContent = payload.name.split(/\s+/)[0] || "friend";
      document.querySelector("#access-email").textContent = payload.email;
      accessForm.hidden = true;
      const done = document.querySelector("#access-done");
      done.hidden = false;
      done.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      say(`${error.message} Please try again in a minute.`, "err");
      button.disabled = false;
      button.innerHTML = buttonLabel;
    }
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
