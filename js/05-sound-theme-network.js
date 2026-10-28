/* ═══════════════════════════════════════════════════
   SECTION 5 · SOUND + THEME + NETWORK
   ═══════════════════════════════════════════════════ */
let AC = null;
let soundOn = localStorage.getItem('sb_sound') === '1';
const TAB_ID = sessionStorage.getItem('sb_tab_id') || Math.random().toString(36).slice(2);
sessionStorage.setItem('sb_tab_id', TAB_ID);
let isSoundLeader = false;
const soundChannel = 'BroadcastChannel' in window ? new BroadcastChannel('sb_admin_sound') : null;

function electSoundLeader() {
  const key = 'sb_sound_lock';
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const now = Date.now();
  if (!data.holder || data.holder === TAB_ID || now - (data.heartbeat || 0) > 8000) {
    localStorage.setItem(key, JSON.stringify({ holder: TAB_ID, heartbeat: now }));
    isSoundLeader = true;
  } else {
    isSoundLeader = data.holder === TAB_ID;
  }
}
setInterval(electSoundLeader, 4000);
electSoundLeader();
soundChannel?.addEventListener('message', e => { if (e.data.type === 'beep') beep(); });

function ensureAC() {
  if (!soundOn) return;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { console.warn(e); }
}
document.addEventListener('pointerdown', ensureAC);
function beep() {
  ensureAC();
  if (!soundOn || !AC) return;
  // تنبيه واضح عند وصول طلب جديد؛ شدة الصوت النهائية تظل خاضعة لصوت الجهاز والمتصفح.
  [880, 1175, 1480, 1175, 880, 1480, 1175, 880].forEach((f, i) => {
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + i * 0.22;
    o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.78, t + 0.025);
    g.gain.setValueAtTime(0.62, t + 0.11);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    o.start(t); o.stop(t + 0.2);
  });
}
function triggerBeep() {
  if (isSoundLeader) beep();
  else soundChannel?.postMessage({ type: 'beep' });
}
function setSoundOn(v) {
  soundOn = v;
  localStorage.setItem('sb_sound', soundOn ? '1' : '0');
  $('snd').classList.toggle('on', soundOn);
  $('snd').setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  if (soundOn) {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume();
    beep();
    toast('تم تفعيل الصوت', 'ok', 1500);
  }
}
if (soundOn) { $('snd').classList.add('on'); $('snd').setAttribute('aria-pressed', 'true'); }
$('snd').onclick = () => setSoundOn(!soundOn);

// Theme — respects prefers-color-scheme when no explicit choice
const savedTheme = localStorage.getItem('sb_theme');
if (savedTheme === 'dark') { document.body.classList.add('dark'); $('theme').textContent = '☀️'; }
else if (savedTheme === 'light') { document.body.classList.add('light'); $('theme').textContent = '🌙'; }
else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark'); $('theme').textContent = '☀️';
}
$('theme').onclick = () => {
  const isDark = document.body.classList.toggle('dark');
  document.body.classList.toggle('light', !isDark);
  $('theme').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('sb_theme', isDark ? 'dark' : 'light');
  redrawCharts();
};

window.addEventListener('online', () => {
  $('rt').classList.add('live'); $('rt').classList.remove('warn');
  $('rt').title = 'متصل';
  if (ME) loadOrders().then(() => refreshIfSafe(page));
  toast('عاد الاتصال', 'ok', 2000);
});
window.addEventListener('offline', () => {
  $('rt').classList.remove('live'); $('rt').classList.add('warn');
  $('rt').title = 'منقطع';
  toast('انقطع الاتصال', 'err', 4000);
});

