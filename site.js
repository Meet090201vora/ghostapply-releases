// Moonshift website: light/dark switch, mobile menu, download buttons and the early access form.

// The site moved to getmoonshift.com. The old GitHub Pages address keeps working (old links,
// emails), but visitors there are sent to the same page on the new domain - only once the new
// domain actually answers, so nothing breaks before it is set up.
const NEW_SITE = "https://getmoonshift.com";
if (location.hostname.endsWith("github.io")) {
  const path = location.pathname.replace(/^\/ghostapply-releases/, "") || "/";
  const target = NEW_SITE + path + location.search + location.hash;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000));
  Promise.race([fetch(NEW_SITE + "/", { mode: "no-cors", cache: "no-store" }), timeout])
    .then(() => location.replace(target))
    .catch(() => {});
}

// ---- Footer year (header and footer are written into each page for search engines) -------

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

// ---- Light / dark -------------------------------------------------------------------------
// A small script in each page's <head> applies the saved choice before the page paints.

// Dark is the default; light only when the visitor picks it.
function effectiveTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute("content", effectiveTheme() === "dark" ? "#0b0d10" : "#f6f7f9");
}

document.querySelector(".theme-toggle")?.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch { /* private mode: still switches for this visit */ }
  syncThemeColor();
});
syncThemeColor();

const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

// ---- Download buttons ---------------------------------------------------------------------
// Every release publishes latest.json next to this site with the exact installer links, so the
// buttons always point at the newest build. Fallbacks: the GitHub API, then the release page.

const RELEASES_REPO = "Meet090201vora/ghostapply-releases";
const RELEASES_API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;
const MANIFEST_URLS = [
  "/latest.json",
  "https://raw.githubusercontent.com/Meet090201vora/ghostapply-releases/main/latest.json",
];

function setDownload(el, url, filename) {
  if (!el || !url) return;
  el.href = url;
  if (filename) el.setAttribute("download", filename);
  else el.removeAttribute("download");
}

async function fetchJSON(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

// Installer file names as each release publishes them (the app was called GhostApply before 0.5.0).
function installersFor(version) {
  const base = `https://github.com/${RELEASES_REPO}/releases/download/v${version}`;
  const [major, minor] = version.split(".").map(Number);
  const name = major > 0 || minor >= 5 ? "Moonshift" : "GhostApply";
  const files = {
    windows: `${name}_${version}_x64-setup.exe`,
    mac: `${name}_${version}_universal.dmg`,
    linux: `${name}_${version}_amd64.AppImage`,
  };
  return Object.fromEntries(Object.entries(files).map(([os, file]) => [os, { url: `${base}/${file}`, file }]));
}

async function fromManifest() {
  for (const url of MANIFEST_URLS) {
    try {
      const manifest = await fetchJSON(url);
      const version = String(manifest.version || "").replace(/^v/, "");
      if (!version) continue;
      return { version, notes: manifest.notes || "", date: manifest.pub_date || "", downloads: manifest.downloads || null };
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
    downloads: {
      windows: pick((n) => n.endsWith("-setup.exe")),
      mac: pick((n) => n.endsWith(".dmg")),
      linux: pick((n) => n.endsWith(".appimage")),
    },
  };
}

function detectOS() {
  const ua = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""} ${navigator.userAgent}`.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(ua)) return "";
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "";
}

async function wireDownloadLinks() {
  const buttons = {
    windows: document.querySelector("#dl-windows"),
    mac: document.querySelector("#dl-mac"),
    linux: document.querySelector("#dl-linux"),
  };
  if (!buttons.windows && !buttons.mac && !buttons.linux) return;

  // Put this visitor's computer first.
  const os = detectOS();
  for (const [key, el] of Object.entries(buttons)) {
    if (!el) continue;
    const mine = key === os;
    el.classList.toggle("btn-primary", mine || (!os && key === "windows"));
    el.classList.toggle("btn-ghost", !(mine || (!os && key === "windows")));
  }
  if (buttons[os]?.parentElement) buttons[os].parentElement.prepend(buttons[os]);
  const phoneNote = document.querySelector("#dl-phone");
  if (phoneNote && /iphone|ipad|ipod|android/i.test(navigator.userAgent)) phoneNote.hidden = false;

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
    const line = document.querySelector("#dl-version");
    if (line) {
      let when = "";
      const date = release.date ? new Date(release.date) : null;
      if (date && !Number.isNaN(date.getTime())) {
        when = `, released ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      }
      line.textContent = `Version ${release.version}${when}. Updates itself after you install it.`;
    }
    const notes = document.querySelector("#dl-notes");
    if (notes && release.notes) {
      document.querySelector("#dl-notes-title").textContent = `New in version ${release.version}`;
      document.querySelector("#dl-notes-body").textContent = release.notes;
      notes.hidden = false;
    }
  }
}
wireDownloadLinks();

// ---- Early access form -> Google Apps Script (saves a row in the Sheet, emails the person) ----

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
    flag(accessForm.querySelector("#os-group"), !accessForm.querySelector('input[name="os"]:checked'));
    flag(accessForm.querySelector(".consent"), !accessForm.elements.consent.checked);
    return first;
  }

  accessForm.addEventListener("input", (event) => {
    if (event.target.classList.contains("invalid")) mark(event.target, false);
    const group = event.target.closest(".chip-group, .consent");
    if (group) mark(group, false);
  });

  accessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    say("");
    const bad = validate();
    if (bad) {
      say("Please fill in the highlighted fields.", "err");
      const target = bad.matches("input, select, textarea") ? bad : bad.querySelector("input");
      target?.focus();
      return;
    }
    const endpoint = accessForm.dataset.endpoint || "";

    const data = new FormData(accessForm);
    const payload = Object.fromEntries(
      [...new Set(data.keys())].map((key) => {
        const values = data.getAll(key).map((v) => String(v).trim());
        return [key, key === "boards" ? values : values[0] || ""];
      }),
    );
    payload.page = location.href;
    payload.userAgent = navigator.userAgent;

    button.disabled = true;
    button.innerHTML = '<span class="spinner" aria-hidden="true"></span>Sending';
    try {
      // text/plain keeps this a "simple" request, so the browser skips the CORS preflight Apps Script can't answer.
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Something went wrong.");
      document.querySelector("#access-name").textContent = payload.name.split(/\s+/)[0] || "there";
      document.querySelector("#access-email").textContent = payload.email;
      accessForm.hidden = true;
      const done = document.querySelector("#access-done");
      done.hidden = false;
      done.scrollIntoView({ behavior: "smooth", block: "center" });
      done.querySelector("h2")?.focus();
    } catch (error) {
      const offline = error instanceof TypeError; // the request never got an answer
      say(offline
        ? "We couldn't send your request. Check your internet connection and try again, or email support@getmoonshift.com."
        : `${error.message} Please try again in a minute.`, "err");
      button.disabled = false;
      button.innerHTML = buttonLabel;
    }
  });
}
