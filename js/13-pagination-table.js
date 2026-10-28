/* ═══════════════════════════════════════════════════
   SECTION 13 · PAGINATION + GENERIC TABLE
   ═══════════════════════════════════════════════════ */
function paginate(arr, key) {
  const size = CONFIG.PAGE_SIZE;
  const idx = pageIdx[key] || 0;
  const total = Math.max(1, Math.ceil(arr.length / size));
  const current = Math.min(idx, total - 1);
  pageIdx[key] = current;
  return { items: arr.slice(current * size, (current + 1) * size), total, current };
}
function renderPager(p, key) {
  if (p.total <= 1) return '';
  return `<div class="pager">
    <button ${p.current === 0 ? 'disabled' : ''} data-page="${p.current - 1}">‹</button>
    <span>${p.current + 1} / ${p.total}</span>
    <button ${p.current >= p.total - 1 ? 'disabled' : ''} data-page="${p.current + 1}">›</button>
  </div>`;
}

