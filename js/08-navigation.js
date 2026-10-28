/* ═══════════════════════════════════════════════════
   SECTION 8 · NAVIGATION
   ═══════════════════════════════════════════════════ */
function go(id) {
  const n = NAV.find(x => x[0] === id);
  if (!n || !can(n[3])) { toast('غير مصرح', 'err'); return; }
  page = id; searchTerm = ''; payFilter = ''; statusFilter = ''; selectionSet.clear();
  try {
    if (ME?.id) localStorage.setItem(`sb_current_page_${ME.id}`, id);
  } catch (_) {}
  $('title').textContent = n[1] + ' ' + n[2];
  $('side').classList.remove('open');
  $('side-bg').style.display = '';
  $('nav').querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.p === id);
    if (b.dataset.p === id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  const v = $('view');
  v.innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  chartRenderFns.length = 0;
  v.focus();

  Promise.resolve((VIEWS[id] || (() => { throw new Error('view missing'); }))(v, id)).catch(e => {
    console.warn(e);
    v.innerHTML = `<div class="empty">حصل خطأ <button class="btn out sm" onclick="location.reload()">إعادة المحاولة</button></div>`;
  });
}
$('nav').onclick = e => { const b = e.target.closest('[data-p]'); if (b) go(b.dataset.p); };
$('burger').onclick = () => { $('side').classList.add('open'); $('side-bg').style.display = 'block'; };
$('side-bg').onclick = () => { $('side').classList.remove('open'); $('side-bg').style.display = ''; };

// More menu
$('more-menu').onclick = () => {
  openModal(`
    <h2>خيارات إضافية <button class="close" onclick="closeModal()">✕</button></h2>
    ${can(OM) ? `<button class="btn out big dng" id="m_emerg" style="margin-bottom:8px;width:100%">${isOpen ? '🚨 إغلاق الطوارئ' : '🟢 فتح المتجر'}</button>` : ''}
    ${can(OM) ? `<button class="btn out big" id="m_settings" style="margin-bottom:8px;width:100%">⚙️ الإعدادات</button>` : ''}
    <button class="btn out big" id="m_help" style="width:100%">❓ مساعدة</button>
  `);
  if ($('m_emerg')) $('m_emerg').onclick = () => { closeModal(); emergencyToggle(); };
  if ($('m_settings')) $('m_settings').onclick = () => { closeModal(); go('settings'); };
  if ($('m_help')) $('m_help').onclick = () => {
    closeModal();
    openModal(`
      <h2>اختصارات لوحة المفاتيح <button class="close" onclick="closeModal()">✕</button></h2>
      <div style="font-size:13px;line-height:2">
        <div><span class="kbd">/</span> بحث في الصفحة</div>
        <div><span class="kbd">R</span> تحديث البيانات</div>
        <div><span class="kbd">Shift</span> + نقر: تحديد طلبات للإجراء الجماعي</div>
        <div><span class="kbd">Esc</span> إغلاق النافذة</div>
      </div>
    `);
  };
};

async function emergencyToggle() {
  const closing = isOpen;
  const msg = closing ? 'المطعم سيُغلق أمام العملاء' : 'المطعم سيعود لاستقبال الطلبات';
  if (closing) {
    if (!await confirmTyped('إغلاق طارئ', msg + ' — لا يمكن التراجع بسهولة.', 'CLOSE')) return;
  } else {
    if (!await ask('فتح', msg, 'فتح')) return;
  }
  try {
    const { error } = await sb.from('store_settings')
      .upsert({ id: CONFIG.SETTINGS_ROW_ID, is_open: !closing, accepting_orders: !closing });
    if (error) throw error;
    setOpen(!closing);
    SETTINGS = { ...SETTINGS, is_open: !closing, accepting_orders: !closing };
    toast(closing ? 'تم الإغلاق' : 'تم الفتح', 'ok');
  } catch (e) { fail(e, 'مفيش صلاحية'); }
}

// Global keyboard shortcuts
document.addEventListener('keydown', e => {
  if ($('ov').classList.contains('show')) return;
  const inInput = document.activeElement?.matches('input,textarea,select');
  if (e.key === '/' && !inInput) {
    e.preventDefault();
    const s = document.querySelector('#view input[type="search"]');
    if (s) s.focus();
  }
  if (e.key === 'r' && !inInput && ME && !e.ctrlKey && !e.metaKey && !e.altKey) { loadOrders().then(() => refreshIfSafe(page)); }
});

