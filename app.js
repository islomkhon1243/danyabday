'use strict';

// Local assets only. Content remains readable if effects or audio are unavailable.
const chapters = Array.from(document.querySelectorAll('.chapter'));
const progress = document.getElementById('progress');
const chapterNumber = document.getElementById('chapter-number');
const chapterLabel = document.getElementById('chapter-label');
const navLinks = Array.from(document.querySelectorAll('.site-header nav a'));
let scheduled = false;

function updateReadingPosition() {
  scheduled = false;
  const page = document.documentElement;
  const scrollable = Math.max(0, page.scrollHeight - window.innerHeight);
  const fraction = scrollable ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  progress.style.transform = `scaleX(${fraction})`;
  const threshold = Math.min(window.innerHeight * 0.35, 220);
  let current = 0;
  chapters.forEach((chapter, index) => {
    if (chapter.getBoundingClientRect().top <= threshold) current = index;
  });
  if (scrollable && window.scrollY >= scrollable - 4) current = chapters.length - 1;
  chapterNumber.textContent = String(current).padStart(2, '0');
  chapterLabel.textContent = chapters[current].dataset.label;
  navLinks.forEach(link => {
    if (link.getAttribute('href') === '#' + chapters[current].id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function scheduleReadingUpdate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(updateReadingPosition);
}
window.addEventListener('scroll', scheduleReadingUpdate, { passive: true });
window.addEventListener('resize', scheduleReadingUpdate);

const tabs = Array.from(document.querySelectorAll('[data-world]'));
function selectWorld(tab, moveFocus = false) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (moveFocus) tab.focus();
  scheduleReadingUpdate();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectWorld(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectWorld(tabs[next], true);
  });
});

const openedQuotes = new Set();
const quoteCards = Array.from(document.querySelectorAll('[data-quote]'));
quoteCards.forEach(card => {
  card.addEventListener('click', () => {
    const open = card.getAttribute('aria-expanded') !== 'true';
    card.setAttribute('aria-expanded', String(open));
    document.getElementById(card.getAttribute('aria-controls')).hidden = !open;
    card.querySelector('.quote-toggle').textContent = open ? '−' : '+';
    // Collection counts cards that have been read, even after collapsing them.
    openedQuotes.add(card.dataset.quote);
    document.getElementById('quote-progress').textContent = `Открыто ${openedQuotes.size} из ${quoteCards.length} реплик`;
    document.getElementById('quote-secret').hidden = openedQuotes.size !== quoteCards.length;
    scheduleReadingUpdate();
  });
});

const celebrateButton = document.getElementById('celebrate');
let celebrateTimer;
celebrateButton.addEventListener('click', () => {
  document.getElementById('celebration-status').textContent = 'Глава 24 открыта. С днём рождения, Даня!';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('motion-off')) return;
  if (celebrateButton.disabled) return;
  celebrateButton.disabled = true;
  const rect = celebrateButton.getBoundingClientRect();
  const colors = ['#b49aff', '#e9fa75', '#f4f1e8'];
  const sparks = [];
  for (let index = 0; index < 28; index++) {
    const spark = document.createElement('span');
    spark.className = 'celebration-spark';
    spark.setAttribute('aria-hidden', 'true');
    const angle = Math.random() * Math.PI * 2;
    const distance = 65 + Math.random() * 150;
    const styles = {
      '--x': `${rect.left + rect.width / 2}px`, '--y': `${rect.top + rect.height / 2}px`,
      '--size': `${4 + Math.random() * 6}px`, '--color': colors[index % colors.length],
      '--dx': `${Math.cos(angle) * distance}px`, '--dy': `${Math.sin(angle) * distance - 45}px`,
      '--rotation': `${Math.random() * 400 - 200}deg`
    };
    Object.entries(styles).forEach(([name, value]) => spark.style.setProperty(name, value));
    document.body.append(spark);
    sparks.push(spark);
  }
  clearTimeout(celebrateTimer);
  celebrateTimer = setTimeout(() => {
    sparks.forEach(spark => spark.remove());
    celebrateButton.disabled = false;
  }, 1100);
});

window.addEventListener('pageshow', scheduleReadingUpdate);
updateReadingPosition();

/* Motion: once-only reveals, bounded scroll movement and fine-pointer tilt. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.getElementById('motion-toggle');
let motionAllowed = !reducedMotion.matches;
function applyMotionPreference() {
  document.body.classList.toggle('motion-off', !motionAllowed || reducedMotion.matches);
  motionButton.setAttribute('aria-pressed', String(motionAllowed && !reducedMotion.matches));
  motionButton.setAttribute('aria-label', motionAllowed && !reducedMotion.matches ? 'Выключить декоративное движение' : 'Включить декоративное движение');
  if (!motionAllowed || reducedMotion.matches) {
    document.querySelectorAll('[data-parallax], [data-tilt]').forEach(el => el.style.removeProperty('transform'));
  }
}
motionButton.addEventListener('click', () => { motionAllowed = !(motionAllowed && !reducedMotion.matches); applyMotionPreference(); });
reducedMotion.addEventListener?.('change', () => { motionAllowed = !reducedMotion.matches; applyMotionPreference(); });
applyMotionPreference();
const revealItems = Array.from(document.querySelectorAll('.section-heading, .manga-panel, .archive-stat, .scene-card, .quote-card, .quest, .birthday-card, .cinema-frame, .memory-line, .finale-letter'));
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
  }, { threshold: 0.06, rootMargin: '0px 0px 25px 0px' });
  revealItems.forEach((el, index) => {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', `${(index % 3) * 65}ms`);
    if (el.getBoundingClientRect().top < window.innerHeight + 30) el.classList.add('is-visible');
    else revealObserver.observe(el);
  });
  document.body.classList.add('motion-ready');
  // If an observer ever stalls, leave the birthday story readable.
  setTimeout(() => revealItems.forEach(el => el.classList.add('is-visible')), 18000);
}
const movingObjects = Array.from(document.querySelectorAll('[data-parallax]'));
let motionFramePending = false;
function updateParallax() {
  motionFramePending = false;
  if (!motionAllowed || reducedMotion.matches) return;
  movingObjects.forEach(el => {
    const rect = el.parentElement.getBoundingClientRect();
    if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
    const offset = Math.max(-40, Math.min(40, (window.innerHeight / 2 - rect.top - rect.height / 2) * Number(el.dataset.parallax)));
    el.style.transform = `translate3d(0,${offset}px,0) rotate(${el.classList.contains('hero-number') ? -9 : el.classList.contains('story-kunai') ? -30 : 0}deg)`;
  });
}
window.addEventListener('scroll', () => {
  if (motionFramePending || !motionAllowed || reducedMotion.matches) return;
  motionFramePending = true; window.requestAnimationFrame(updateParallax);
}, { passive: true });
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    let pending = false, targetX = 0, targetY = 0;
    card.addEventListener('pointermove', event => {
      if (!motionAllowed || reducedMotion.matches) return;
      const rect = card.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => {
        pending = false;
        if (!motionAllowed || reducedMotion.matches) return;
        card.style.transform = `perspective(1100px) rotateX(${-targetY * 5}deg) rotateY(${targetX * 7}deg) translateZ(8px)`;
      });
    });
    card.addEventListener('pointerleave', () => card.style.removeProperty('transform'));
  });
}

/* Gallery opens an accessible native dialog, no heavyweight library. */
const viewer = document.getElementById('image-viewer');
let viewerTrigger;
function closeViewer() { viewer.close(); document.body.style.removeProperty('overflow'); viewerTrigger?.focus(); }
document.querySelectorAll('[data-full]').forEach(button => button.addEventListener('click', () => {
  viewerTrigger = button;
  const img = document.getElementById('viewer-image'); img.src = button.dataset.full; img.alt = button.dataset.caption;
  document.getElementById('viewer-caption').textContent = button.dataset.caption;
  if (typeof viewer.showModal === 'function') { viewer.showModal(); document.body.style.overflow = 'hidden'; }
}));
document.getElementById('viewer-close').addEventListener('click', closeViewer);
viewer.addEventListener('close', () => { document.body.style.removeProperty('overflow'); viewerTrigger?.focus(); });
viewer.addEventListener('click', event => { if (event.target === viewer) { const r = viewer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeViewer(); } });

/* Playlist: supplied files or temporary local picks; no autoplay before a gesture. */
const config = window.BIRTHDAY_CONFIG || {};
let tracks = Array.isArray(config.tracks) ? config.tracks.filter(t => t && typeof t.src === 'string' && t.src.trim()).map(t => ({ src: t.src, title: t.title || 'Birthday OST' })) : [];
const voices = config.voices || {};
const music = new Audio(); music.preload = 'none';
const voice = new Audio(); voice.preload = 'none';
voice.volume = Math.max(0, Math.min(1, Number(config.voiceVolume ?? 1) || 0));
let baseVolume = Math.max(0, Math.min(1, Number(config.musicVolume ?? .45) || 0));
let trackIndex = 0, musicRequest = 0, voiceRequest = 0, voiceKey = '', wantsMusic = false, musicLoaded = false;
let failedTracks = new Set();
const player = document.querySelector('.music-player');
const playButton = document.getElementById('music-play');
const nextButton = document.getElementById('music-next');
const trackTitle = document.getElementById('track-title');
const musicStatus = document.getElementById('music-status');
const volumeInput = document.getElementById('music-volume');
const seekInput = document.getElementById('music-seek');
const settingsButton = document.getElementById('music-settings');
const musicPanel = document.getElementById('music-panel');
const fileInput = document.getElementById('music-files');
const stopVoiceButton = document.getElementById('voice-stop');
const autoVoice = document.getElementById('autovoice');
const blobURLs = [];
let toastTimer;
function toast(message) {
  const el = document.getElementById('toast'); el.textContent = message; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}
function duckMusic() { music.volume = baseVolume * (voiceKey ? .2 : 1); }
duckMusic(); volumeInput.value = Math.round(baseVolume * 100);
function renderPlaylist() {
  const list = document.getElementById('track-list'); list.replaceChildren();
  tracks.forEach((track, index) => {
    const li = document.createElement('li'), button = document.createElement('button');
    button.type = 'button'; button.textContent = `${String(index + 1).padStart(2, '0')} / ${track.title}`;
    if (index === trackIndex) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => { failedTracks.clear(); loadTrack(index); playMusic(); });
    li.append(button); list.append(li);
  });
  nextButton.disabled = tracks.length < 2;
  trackTitle.textContent = tracks[trackIndex]?.title || 'Твой саундтрек';
}
function renderPlayState() {
  const playing = !music.paused;
  player.classList.toggle('is-playing', playing);
  playButton.textContent = playing ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', playing ? 'Поставить музыку на паузу' : 'Включить музыку');
  musicStatus.textContent = playing ? `Трек ${trackIndex + 1} из ${tracks.length}` : tracks.length ? 'Нажми ▶ — продолжим со звуком' : 'Выбери музыку для этого вечера';
}
function formatTime(t) { if (!Number.isFinite(t) || t < 0) return '0:00'; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; }
function updateTime() {
  const duration = music.duration;
  seekInput.disabled = !(Number.isFinite(duration) && duration > 0);
  seekInput.value = seekInput.disabled ? 0 : Math.round(music.currentTime / duration * 1000);
  document.getElementById('music-time').textContent = `${formatTime(music.currentTime)} / ${formatTime(duration)}`;
}
function loadTrack(index) {
  if (!tracks.length) return;
  musicRequest++; music.pause(); musicLoaded = true;
  trackIndex = ((index % tracks.length) + tracks.length) % tracks.length;
  music.src = tracks[trackIndex].src; music.load();
  renderPlaylist(); updateTime(); renderPlayState();
}
async function playMusic() {
  if (!tracks.length) { fileInput.click(); return; }
  if (!musicLoaded) loadTrack(trackIndex);
  const request = ++musicRequest; wantsMusic = true;
  try {
    await music.play();
    if (request !== musicRequest) return;
    failedTracks.delete(trackIndex); renderPlayState();
  } catch (err) {
    if (request !== musicRequest) return;
    if (err.name === 'AbortError') return;
    wantsMusic = false; renderPlayState();
    musicStatus.textContent = err.name === 'NotAllowedError' ? 'Нажми ▶, чтобы включить звук' : 'Не удалось открыть трек. Выбери другой';
  }
}
function pauseMusic() { musicRequest++; wantsMusic = false; music.pause(); renderPlayState(); }
playButton.addEventListener('click', () => {
  if (!music.paused || wantsMusic) pauseMusic();
  else { failedTracks.clear(); playMusic(); }
});
nextButton.addEventListener('click', () => {
  failedTracks.clear(); loadTrack(trackIndex + 1); playMusic();
});
music.addEventListener('play', renderPlayState); music.addEventListener('pause', renderPlayState);
music.addEventListener('timeupdate', updateTime); music.addEventListener('loadedmetadata', updateTime);
music.addEventListener('ended', () => { if (!wantsMusic || !tracks.length) return; loadTrack(trackIndex + 1); playMusic(); });
music.addEventListener('error', () => {
  if (!musicLoaded) return;
  failedTracks.add(trackIndex);
  if (wantsMusic && failedTracks.size < tracks.length) {
    let next = (trackIndex + 1) % tracks.length;
    while (failedTracks.has(next)) next = (next + 1) % tracks.length;
    loadTrack(next); playMusic();
  } else {
    wantsMusic = false; musicRequest++; music.pause(); renderPlayState();
    musicStatus.textContent = 'Файл недоступен — выбери другой трек';
  }
});
volumeInput.addEventListener('input', () => { baseVolume = Number(volumeInput.value) / 100; duckMusic(); });
seekInput.addEventListener('input', () => { if (Number.isFinite(music.duration) && music.duration > 0) music.currentTime = Number(seekInput.value) / 1000 * music.duration; });
settingsButton.addEventListener('click', () => { musicPanel.hidden = !musicPanel.hidden; settingsButton.setAttribute('aria-expanded', String(!musicPanel.hidden)); });
document.addEventListener('click', event => { if (!musicPanel.hidden && !player.contains(event.target)) { musicPanel.hidden = true; settingsButton.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !musicPanel.hidden) { musicPanel.hidden = true; settingsButton.setAttribute('aria-expanded', 'false'); settingsButton.focus(); } });
document.getElementById('music-add').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files || []).filter(f => f.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(f.name));
  if (!files.length) return;
  pauseMusic(); music.removeAttribute('src'); music.load();
  blobURLs.forEach(url => URL.revokeObjectURL(url)); blobURLs.length = 0;
  tracks = files.map(file => { const url = URL.createObjectURL(file); blobURLs.push(url); return { title: file.name.replace(/\.[^.]+$/, ''), src: url }; });
  failedTracks.clear(); loadTrack(0); playMusic(); fileInput.value = '';
});
document.querySelector('.hero-copy .button').addEventListener('click', () => { if (tracks.length && !wantsMusic) playMusic(); });
renderPlaylist(); renderPlayState();

/* Voices: only configured scenes expose playback, music ducks during speech. */
function renderVoiceState() {
  document.querySelectorAll('[data-voice]').forEach(button => {
    const active = button.dataset.voice === voiceKey;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '■ Остановить поздравление' : button.dataset.voice === 'finale' ? '▶ Послушать поздравление от друга' : '▶ Послушать поздравление';
  });
  player.classList.toggle('voice-active', Boolean(voiceKey)); stopVoiceButton.hidden = !voiceKey;
  duckMusic();
}
function stopVoice() { voiceRequest++; voice.pause(); voiceKey = ''; renderVoiceState(); }
async function playVoice(key, automatic = false) {
  if (!voices[key]) return;
  if (voiceKey === key && !automatic) { stopVoice(); return; }
  voiceRequest++; voice.pause(); voiceKey = key; const request = voiceRequest;
  voice.src = voices[key]; renderVoiceState();
  try { await voice.play(); return request === voiceRequest; } catch (err) {
    if (request !== voiceRequest) return;
    stopVoice(); if (!automatic) toast('Озвучка пока недоступна. Можно прочитать поздравление.');
    return false;
  }
}
const voiceButtons = Array.from(document.querySelectorAll('[data-voice]'));
voiceButtons.forEach(button => {
  if (typeof voices[button.dataset.voice] !== 'string' || !voices[button.dataset.voice].trim()) return;
  button.hidden = false;
  button.addEventListener('click', () => playVoice(button.dataset.voice));
});
voice.addEventListener('ended', stopVoice);
voice.addEventListener('error', () => { if (voiceKey) { stopVoice(); toast('Не удалось открыть озвучку.'); } });
stopVoiceButton.addEventListener('click', stopVoice);
const playedScenes = new Set();
let audioUnlocked = false;
let tryVisibleVoice = () => {};
if (voiceButtons.some(button => !button.hidden) && 'IntersectionObserver' in window) {
  document.getElementById('autovoice-label').hidden = false;
  const targets = [...document.querySelectorAll('[data-scene]'), document.querySelector('.finale-letter')];
  const visibleScenes = new Map();
  tryVisibleVoice = () => {
    if (!autoVoice.checked || !audioUnlocked || voiceKey) return;
    const visible = [...visibleScenes.entries()].filter(([, ratio]) => ratio >= .55).sort((a, b) => b[1] - a[1]);
    for (const [target] of visible) {
      const key = target.dataset.scene || 'finale';
      if (voices[key] && !playedScenes.has(key)) {
        // A blocked play is not counted as a scene that has been heard.
        playedScenes.add(key);
        playVoice(key, true).then(success => { if (!success) playedScenes.delete(key); });
        break;
      }
    }
  };
  const voiceObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) visibleScenes.set(entry.target, entry.intersectionRatio); else visibleScenes.delete(entry.target); });
    tryVisibleVoice();
  }, { threshold: [.0, .55] });
  targets.forEach(el => voiceObserver.observe(el));
  autoVoice.addEventListener('change', () => {
    if (!autoVoice.checked) { stopVoice(); return; }
    audioUnlocked = true;
    unlockVoiceElement();
    tryVisibleVoice();
  });
}
function unlockVoiceElement() {
  if (voiceKey || !voiceButtons.some(button => !button.hidden)) return;
  // Use the same audio element inside a real click, including on iPhones.
  voice.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACA';
  voice.play().then(() => { if (!voiceKey) voice.pause(); }).catch(() => {});
}
let firstAudioGestureHandled = false;
document.addEventListener('click', event => {
  if (firstAudioGestureHandled || event.isTrusted === false) return;
  firstAudioGestureHandled = true;
  audioUnlocked = true;
  unlockVoiceElement();
  tryVisibleVoice();
  // Never undo a pause or compete with an explicit player control.
  if (config.autoplayMusic !== false && tracks.length && music.paused && !wantsMusic && !player.contains(event.target)) playMusic();
});
// Autoplay with sound depends on browser policy; keep the play button available.
if (config.autoplayMusic !== false && tracks.length) playMusic();
window.addEventListener('pagehide', () => { pauseMusic(); stopVoice(); });

// A little optional scene before the final letter.
const giftButton = document.getElementById('gift-open');
giftButton.addEventListener('click', () => {
  const open = giftButton.getAttribute('aria-expanded') !== 'true';
  giftButton.setAttribute('aria-expanded', String(open));
  document.getElementById('gift-secret').hidden = !open;
  giftButton.querySelector('span').textContent = open ? 'ПОДАРОК ОТКРЫТ ✦' : 'ОТКРЫТЬ ✦';
  scheduleReadingUpdate();
});
