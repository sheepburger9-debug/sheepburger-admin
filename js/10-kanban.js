/* ═══════════════════════════════════════════════════
   SECTION 10 · KANBAN
   ═══════════════════════════════════════════════════ */
const sig = o => [o.status, o.assigned_driver_id, o.total, (o.order_items || []).length, o.payment_method, o.payment_status].join('|');

function cardHTML(o) {
  const s = ST[o.status] || {};
  const items = (o.order_items || []).map(i => `${i.quantity}× ${esc(i.item_name || i.name || '—')}`).join('، ');
  const totalItems = (o.order_items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
  const isSelected = selectionSet.has(o.id);
  return `
    <div class="oh">
      <b>#${esc(o.order_number ?? o.id)}</b>
      <time data-t="${o.created_at}"></time>
    </div>
    <div><b>${esc(o.customer_name || '—')}</b> <span class="item-count">${totalItems}</span></div>
    <div class="oi">${items || '—'}</div>
    <div style="margin:6px 0;display:flex;gap:4px;flex-wrap:wrap">${payBadge(o.payment_method)} ${payStatusBadge(o.payment_status)}</div>
    <div class="of"><b>${money(o.total)}</b></div>
    ${o.assigned_driver_id ? `<div class="od">🛵 ${esc(driverName(o.assigned_driver_id))} <button class="btn out sm" data-a="call" title="اتصال">📞</button></div>` : ''}
    ${o.cancel_reason ? `<div class="od" style="color:var(--err)">❌ ${esc(o.cancel_reason)}</div>` : ''}
    <div class="oa">
      ${s.next && can(s.by) ? `<button class="btn pri big" data-a="adv">${s.n}</button>` : ''}
      ${['ready','out_for_delivery'].includes(o.status) && can([...OM, 'dispatcher']) ? '<button class="btn out" data-a="drv" title="تعيين مندوب">🛵</button>' : ''}
      ${can([...OM, 'cashier']) && !['delivered','cancelled'].includes(o.status) ? '<button class="btn out dng" data-a="cx">إلغاء</button>' : ''}
    </div>`;
}

function paint(o) {
  const board = $('board');
  if (page !== 'orders' || !board) return;
  let card = board.querySelector(`[data-id="${o.id}"]`);
  if (!KCOLS.includes(o.status)) {
    if (card) { card.classList.add('cx'); setTimeout(() => { card.remove(); counts(); }, 250); }
    return;
  }
  const list = board.querySelector(`[data-col="${o.status}"] .list`);
  const s = sig(o);
  if (!card) {
    card = document.createElement('div');
    card.className = 'ocard';
    card.dataset.id = o.id;
    card.draggable = true;
  }
  if (card.dataset.sig !== s) {
    const first = card.isConnected ? card.getBoundingClientRect() : null;
    card.dataset.sig = s;
    card.innerHTML = cardHTML(o);
    card.dataset.s = [o.order_number, o.id, o.customer_name, o.customer_phone].join(' ');
    card.dataset.pay = String(o.payment_method || '').toLowerCase();
    card.classList.toggle('selected', selectionSet.has(o.id));
    if (card.parentNode !== list) {
      list.prepend(card);
      if (first) {
        const l = card.getBoundingClientRect();
        card.animate(
          [{ transform:`translate(${first.left - l.left}px,${first.top - l.top}px)` }, { transform:'none' }],
          { duration:320, easing:'cubic-bezier(.2,.8,.2,1)' }
        );
      }
    }
  }
  tick(); counts(); applyFilter();
}

function counts() {
  document.querySelectorAll('#board .col').forEach(c => {
    const total = c.querySelectorAll('.ocard').length;
    const visible = c.querySelectorAll('.ocard:not(.hide)').length;
    c.querySelector('[data-cnt]').textContent = visible + (visible !== total ? '/' + total : '');
  });
}
setInterval(() => { if (!document.hidden) tick(); }, 30000);
function tick() {
  document.querySelectorAll('#board .ocard').forEach(c => {
    const o = ORD.get(c.dataset.id) || ORD.get(Number(c.dataset.id));
    if (!o) return;
    const m = Math.floor((Date.now() - new Date(o.created_at)) / 60000);
    const tt = c.querySelector('time');
    if (tt) tt.textContent = m < 1 ? 'الآن' : `منذ ${m}د`;
    c.classList.toggle('urgent', m > (URGENT[o.status] || 99));
  });
}

// Drag and drop
document.addEventListener('dragstart', e => {
  const card = e.target.closest?.('.ocard');
  if (!card) return;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.id);
});
document.addEventListener('dragend', e => {
  e.target.closest?.('.ocard')?.classList.remove('dragging');
  document.querySelectorAll('.col.drag-over').forEach(c => c.classList.remove('drag-over'));
});
document.addEventListener('dragover', e => {
  const col = e.target.closest?.('.col');
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.col.drag-over').forEach(c => c.classList.remove('drag-over'));
  col.classList.add('drag-over');
});
document.addEventListener('drop', async e => {
  const col = e.target.closest?.('.col');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain');
  const o = ORD.get(id);
  if (!o) return;
  const newStatus = col.dataset.col;
  if (!newStatus || newStatus === o.status) return;
  const from = KCOLS.indexOf(o.status), to = KCOLS.indexOf(newStatus);
  if (from < 0 || to < 0) return;
  if (to === from + 1) {
    if (!can(ST[o.status].by)) { toast('غير مصرح بهذا الانتقال', 'err'); return; }
  } else if (to < from) {
    if (!can(OM)) { toast('الرجوع للمدير فقط', 'err'); return; }
    if (!await ask('رجوع', `إرجاع #${o.order_number ?? o.id} إلى "${ST[newStatus].l}"؟`, 'رجوع')) return;
  } else { toast('لا يمكن تخطي مراحل', 'err'); return; }
  setStatus(o, newStatus, null, null, true);
});

