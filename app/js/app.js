const STREAM_URL = "https://radio.aifm.su/listen/aifm/radio.mp3";
const METADATA_URL = "https://radio.aifm.su/api/nowplaying/aifm";
const CONTACT_URL = "https://radioaifm-contact.pesnibulgara.workers.dev";
const DEFAULT_ART = "icons/icon-512.png";

const audio = document.getElementById("radioAudio");
const playBtn = document.getElementById("playBtn");
const playMini = document.getElementById("playMini");
const statusEl = document.getElementById("statusText");
const titleEl = document.getElementById("trackTitle");
const artistEl = document.getElementById("trackArtist");
const artEl = document.getElementById("coverArt");
const nextTitleEl = document.getElementById("nextTitle");
const nextArtEl = document.getElementById("nextArt");
const progressEl = document.getElementById("progressBar");
const elapsedEl = document.getElementById("elapsed");
const remainingEl = document.getElementById("remaining");
const volEl = document.getElementById("volume");
const historyEl = document.getElementById("historyList");
const scheduleEl = document.getElementById("scheduleList");
const mini = document.getElementById("miniPlayer");
const miniTitle = document.getElementById("miniTitle");
const miniArt = document.getElementById("miniArt");
const installBanner = document.getElementById("installBanner");

let playing = false;
let loading = false;
let metaTimer = null;
let nowPlaying = { title: "Radio AI FM", artist: "AI-радио будущего", art: DEFAULT_ART, elapsed: 0, duration: 0 };
let deferredPrompt = null;

const SCHEDULE = [
  { time: "07:00", title: "Утренний запуск", host: "Алекс Волна" },
  { time: "10:00", title: "Дневной поток", host: "Мария Эфир" },
  { time: "13:00", title: "AI Микс", host: "Radio AI FM" },
  { time: "16:00", title: "Вечерняя атмосфера", host: "Макс Частота" },
  { time: "19:00", title: "Ночная волна", host: "Мария Эфир" },
  { time: "22:00", title: "Cosmos Late Night", host: "Алекс Волна" },
  { time: "00:00", title: "Автоматический эфир", host: "Radio AI FM" }
];

function svgPlay() {
  return `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
}
function svgPause() {
  return `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`;
}
function svgPlaySm() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
}
function svgPauseSm() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`;
}

function setPlayIcons() {
  const icon = playing ? svgPause() : svgPlay();
  const iconSm = playing ? svgPauseSm() : svgPlaySm();
  playBtn.innerHTML = icon;
  playMini.innerHTML = iconSm;
  playBtn.classList.toggle("loading", loading && playing);
  playBtn.setAttribute("aria-label", playing ? "Пауза" : "Слушать");
}

function setStatus(text, isError = false) {
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", isError);
}

async function togglePlay() {
  if (playing) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    playing = false;
    loading = false;
    setPlayIcons();
    setStatus("");
    updateMediaSession();
    return;
  }
  loading = true;
  playing = true;
  setPlayIcons();
  setStatus("Буферизация…");
  try {
    audio.src = STREAM_URL + (STREAM_URL.includes("?") ? "&" : "?") + "t=" + Date.now();
    audio.load();
    await audio.play();
  } catch (err) {
    playing = false;
    loading = false;
    setPlayIcons();
    setStatus("Не удалось запустить эфир. Нажмите ещё раз.", true);
  }
}

audio.addEventListener("playing", () => {
  loading = false;
  setPlayIcons();
  setStatus("В эфире");
  updateMediaSession();
});
audio.addEventListener("waiting", () => {
  loading = true;
  setPlayIcons();
  setStatus("Буферизация…");
});
audio.addEventListener("error", () => {
  if (!playing) return;
  playing = false;
  loading = false;
  setPlayIcons();
  setStatus("Нет соединения с потоком.", true);
});

volEl.addEventListener("input", () => {
  audio.volume = Number(volEl.value) / 100;
});
audio.volume = Number(volEl.value) / 100;

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function parseTrack(song = {}) {
  let artist = (song.artist || "").trim();
  let title = (song.title || song.text || "").trim();
  if (!artist && title.includes(" — ")) {
    const parts = title.split(" — ");
    artist = parts.pop().trim();
    title = parts.join(" — ").trim();
  } else if (!artist && title.includes(". ")) {
    const parts = title.split(". ");
    if (parts.length > 1) {
      artist = parts.slice(1).join(". ").trim();
      title = parts[0].trim();
    }
  }
  if (!title) title = "Radio AI FM";
  if (!artist) artist = "AI-радио будущего";
  return { artist, title, art: song.art || DEFAULT_ART };
}

function setCover(el, src) {
  if (!el) return;
  const url = src || DEFAULT_ART;
  if (el.dataset.src === url) return;
  el.dataset.src = url;
  el.classList.remove("visible");
  const img = new Image();
  img.onload = () => {
    el.src = url;
    el.classList.add("visible");
  };
  img.onerror = () => {
    el.src = DEFAULT_ART;
    el.classList.add("visible");
  };
  img.src = url;
}

function renderNow() {
  titleEl.textContent = nowPlaying.title;
  artistEl.textContent = nowPlaying.artist;
  miniTitle.textContent = nowPlaying.title;
  setCover(artEl, nowPlaying.art);
  setCover(miniArt, nowPlaying.art);
  const dur = nowPlaying.duration || 0;
  const elapsed = nowPlaying.elapsed || 0;
  progressEl.style.width = dur ? Math.min(100, (elapsed / dur) * 100) + "%" : "0%";
  elapsedEl.textContent = fmt(elapsed);
  remainingEl.textContent = dur ? "-" + fmt(Math.max(0, dur - elapsed)) : "--:--";
}

function updateMediaSession() {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: nowPlaying.title,
    artist: nowPlaying.artist,
    album: "Radio AI FM",
    artwork: [
      { src: nowPlaying.art || DEFAULT_ART, sizes: "512x512", type: "image/png" }
    ]
  });
  navigator.mediaSession.playbackState = playing ? "playing" : "paused";
}

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => { if (!playing) togglePlay(); });
  navigator.mediaSession.setActionHandler("pause", () => { if (playing) togglePlay(); });
  navigator.mediaSession.setActionHandler("stop", () => { if (playing) togglePlay(); });
}

async function fetchNowPlaying() {
  try {
    const res = await fetch(METADATA_URL, { cache: "no-store" });
    const data = await res.json();
    const song = data.now_playing?.song || {};
    const parsed = parseTrack(song);
    nowPlaying = {
      ...parsed,
      elapsed: data.now_playing?.elapsed || 0,
      duration: data.now_playing?.duration || 0
    };
    renderNow();
    updateMediaSession();

    const next = data.playing_next?.song;
    if (next) {
      const n = parseTrack(next);
      nextTitleEl.textContent = n.artist === "AI-радио будущего" ? n.title : `${n.title} — ${n.artist}`;
      setCover(nextArtEl, n.art);
    }

    renderHistory(data.song_history || []);
  } catch {
    /* keep last known */
  }
}

function renderHistory(items) {
  if (!historyEl) return;
  historyEl.innerHTML = items.slice(0, 12).map((item) => {
    const t = parseTrack(item.song || {});
    const when = item.played_at ? new Date(item.played_at * 1000) : null;
    const hh = when ? when.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
    return `<div class="history-item">
      <img src="${t.art}" alt="" onerror="this.src='${DEFAULT_ART}'">
      <div><b>${escapeHtml(t.title)}</b><span>${escapeHtml(t.artist)}${hh ? " · " + hh : ""}</span></div>
    </div>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function moscowMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour").value);
  const m = Number(parts.find((p) => p.type === "minute").value);
  return h * 60 + m;
}

function renderSchedule() {
  const now = moscowMinutes();
  const times = SCHEDULE.map((s) => {
    const [h, m] = s.time.split(":").map(Number);
    return h * 60 + m;
  });
  let current = 0;
  for (let i = 0; i < times.length; i++) {
    const start = times[i];
    const end = times[(i + 1) % times.length];
    if (end > start) {
      if (now >= start && now < end) current = i;
    } else if (now >= start || now < end) {
      current = i;
    }
  }
  scheduleEl.innerHTML = SCHEDULE.map((s, i) => {
    const badge = i === current
      ? `<span class="badge live">В ЭФИРЕ</span>`
      : i === (current + 1) % SCHEDULE.length
        ? `<span class="badge soon">СКОРО</span>`
        : "";
    return `<div class="sched-item">
      <div class="time-badge">${s.time}</div>
      <div><b>${s.title}</b><span>${s.host}</span></div>
      ${badge}
    </div>`;
  }).join("");
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === "screen-" + id));
  document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("active", el.dataset.screen === id));
  mini.classList.toggle("show", id !== "player");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showScreen(tab.dataset.screen));
});
mini.addEventListener("click", (e) => {
  if (e.target.closest("#playMini")) return;
  showScreen("player");
});

playBtn.addEventListener("click", togglePlay);
playMini.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlay();
});

document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const note = document.getElementById("formNote");
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  btn.disabled = true;
  note.textContent = "Отправка…";
  note.className = "";
  try {
    const res = await fetch(CONTACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message })
    });
    const data = await res.json();
    if (data.ok) {
      note.textContent = "Сообщение отправлено!";
      note.className = "ok";
      e.target.reset();
    } else {
      note.textContent = data.error || "Не получилось отправить.";
      note.className = "err";
    }
  } catch {
    note.textContent = "Нет соединения. Попробуйте позже.";
    note.className = "err";
  } finally {
    btn.disabled = false;
  }
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.add("show");
});
document.getElementById("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBanner.classList.remove("show");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

const params = new URLSearchParams(location.search);
if (params.get("play") === "1") {
  togglePlay();
}

setPlayIcons();
renderNow();
renderSchedule();
fetchNowPlaying();
setInterval(fetchNowPlaying, 12000);
setInterval(() => {
  if (nowPlaying.duration) {
    nowPlaying.elapsed = Math.min(nowPlaying.duration, (nowPlaying.elapsed || 0) + 1);
    renderNow();
  }
}, 1000);
setInterval(renderSchedule, 30000);
