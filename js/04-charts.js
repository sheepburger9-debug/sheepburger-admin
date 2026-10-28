/* ═══════════════════════════════════════════════════
   SECTION 4 · CHARTS
   ═══════════════════════════════════════════════════ */
const chartRenderFns = [];
function onChart(canvas, renderFn) {
  if (!canvas) return;
  renderFn(canvas);
  chartRenderFns.push({ canvas, renderFn });
}
function redrawCharts() {
  const alive = chartRenderFns.filter(x => x.canvas.isConnected);
  chartRenderFns.length = 0;
  chartRenderFns.push(...alive);
  alive.forEach(({ canvas, renderFn }) => renderFn(canvas));
}
window.addEventListener('resize', debounce(redrawCharts, 200));

function prepCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth || 300, H = cv.clientHeight || 200;
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  const ink2 = getComputedStyle(document.body).getPropertyValue('--ink2').trim() || '#6E6154';
  const ink = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#1F1610';
  return { c, W, H, ink2, ink };
}
function barChart(cv, labels, vals, colors) {
  const { c, W, H, ink2 } = prepCanvas(cv);
  const pad = { t:10, r:8, b:26, l:8 }, cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const max = Math.max(...vals, 1);
  const step = cw / vals.length, bw = step * 0.6;
  vals.forEach((v, i) => {
    const bh = ch * (v / max);
    const x = pad.l + i * step + (step - bw) / 2;
    const y = pad.t + ch - bh;
    c.fillStyle = colors ? colors[i % colors.length] : '#D9401F';
    const r = Math.min(6, bw/2, bh);
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + bw - r, y);
    c.quadraticCurveTo(x + bw, y, x + bw, y + r);
    c.lineTo(x + bw, y + bh); c.lineTo(x, y + bh); c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y); c.closePath(); c.fill();
    c.fillStyle = ink2; c.font = '11px Cairo, sans-serif'; c.textAlign = 'center';
    if (labels[i]) c.fillText(labels[i], x + bw / 2, H - 8);
  });
}
function donutChart(cv, parts, centerLabel) {
  const { c, W, H, ink } = prepCanvas(cv);
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 8, r = R * 0.62;
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  let a0 = -Math.PI / 2;
  parts.forEach(p => {
    const a1 = a0 + (p.v / total) * Math.PI * 2;
    c.beginPath(); c.arc(cx, cy, R, a0, a1); c.arc(cx, cy, r, a1, a0, true);
    c.closePath(); c.fillStyle = p.c; c.fill(); a0 = a1;
  });
  c.fillStyle = ink; c.font = '700 15px Cairo, sans-serif'; c.textAlign = 'center';
  c.fillText(centerLabel || total.toLocaleString('ar-EG'), cx, cy + 5);
}
function lineChart(cv, labels, vals, color) {
  if (!vals.length) return;
  const { c, W, H, ink2 } = prepCanvas(cv);
  const pad = { t:10, r:8, b:26, l:8 }, cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const max = Math.max(...vals, 1);
  const step = cw / Math.max(vals.length - 1, 1);
  const pts = vals.map((v, i) => [pad.l + i * step, pad.t + ch - ch * (v / max)]);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  pts.forEach(([x, y]) => c.lineTo(x, y));
  c.lineTo(pad.l + cw, pad.t + ch); c.lineTo(pad.l, pad.t + ch); c.closePath();
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + '55'); grad.addColorStop(1, color + '00');
  c.fillStyle = grad; c.fill();
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  pts.forEach(([x, y]) => c.lineTo(x, y));
  c.strokeStyle = color; c.lineWidth = 2.5; c.stroke();
  pts.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI*2); c.fillStyle = color; c.fill(); });
  c.fillStyle = ink2; c.font = '10px Cairo, sans-serif'; c.textAlign = 'center';
  labels.forEach((l, i) => c.fillText(l, pts[i][0], H - 8));
}

