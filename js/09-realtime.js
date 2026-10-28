/* ═══════════════════════════════════════════════════
   SECTION 9 · REALTIME
   ═══════════════════════════════════════════════════ */
function refreshIfSafe(targetPage) {
  if (page !== targetPage) return;
  if (document.querySelector('#view input:focus, #view select:focus, #view textarea:focus')) return;
  const v = $('view');
  if (v && VIEWS[page]) Promise.resolve(VIEWS[page](v, page)).catch(console.warn);
}
function startRealtime() {
  if (!sb) return;
  if (channel) { sb.removeChannel(channel); channel = null; }
  channel = sb.channel('sb-admin-live')
    .on('postgres_changes', { event:'*', schema:'public', table:'orders' }, onOrder)
    .on('postgres_changes', { event:'*', schema:'public', table:'order_items' }, async p => {
      const id = p.new?.order_id ?? p.old?.order_id;
      if (id == null) return;
      const r = await sb.from('orders').select('*,order_items(*)').eq('id', id).maybeSingle();
      if (r.data) { ORD.set(r.data.id, r.data); paint(r.data); if (page === 'dashboard') stats(); }
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'drivers' }, async () => {
      await loadDrivers();
      if (page === 'orders') [...ORD.values()].forEach(paint);
      refreshIfSafe('drivers');
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'store_settings' }, p => {
      if (p.new) {
        SETTINGS = { ...SETTINGS, ...p.new };
        if (p.new.is_open !== undefined) setOpen(p.new.is_open);
      }
      refreshIfSafe('home-controls');
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'menu_items' }, () => refreshIfSafe('menu'))
    .on('postgres_changes', { event:'*', schema:'public', table:'coupons' }, () => refreshIfSafe('coupons'))
    .on('postgres_changes', { event:'*', schema:'public', table:'menu_promotions' }, () => {
      refreshIfSafe('offers');
      refreshIfSafe('home-controls');
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'profiles' }, () => refreshIfSafe('customers'))
    .on('postgres_changes', { event:'*', schema:'public', table:'reviews' }, () => refreshIfSafe('reviews'))
    .on('postgres_changes', { event:'*', schema:'public', table:'admin_notifications' }, () => refreshIfSafe('notifications'))
    .on('postgres_changes', { event:'*', schema:'public', table:'secret_menu_codes' }, () => refreshIfSafe('secret'))
    .on('postgres_changes', { event:'*', schema:'public', table:'user_roles' }, () => refreshIfSafe('staff'))
    .on('postgres_changes', { event:'*', schema:'public', table:'admin_audit_log' }, () => refreshIfSafe('audit'))
    .on('postgres_changes', { event:'*', schema:'public', table:'categories' }, () => refreshIfSafe('categories'))
    .on('postgres_changes', { event:'*', schema:'public', table:'subcategories' }, () => { if (page === 'menu') refreshIfSafe('menu'); if (page === 'categories') refreshIfSafe('categories'); })
    .on('postgres_changes', { event:'*', schema:'public', table:'addons' }, () => refreshIfSafe('addons'))
    .subscribe(s => {
      $('rt').classList.toggle('live', s === 'SUBSCRIBED');
      $('rt').classList.toggle('warn', s !== 'SUBSCRIBED' && s !== 'CLOSED');
      $('rt').title = s === 'SUBSCRIBED' ? 'متصل' : 'منقطع';
    });
}
async function onOrder(p) {
  if (p.eventType === 'DELETE') {
    ORD.delete(p.old.id);
    const card = document.querySelector(`.ocard[data-id="${p.old.id}"]`);
    if (card) { card.classList.add('cx'); setTimeout(() => card.remove(), 250); }
    badge(); return;
  }
  let o = p.new;
  if (p.eventType === 'INSERT') {
    const r = await sb.from('orders').select('*,order_items(*)').eq('id', o.id).single();
    if (r.data) o = r.data;
    triggerBeep();
    toast(`🔔 طلب جديد #${o.order_number ?? o.id} — ${money(o.total)}`, 'ord', 8000, () => go('orders'));
  } else {
    o = { ...(ORD.get(o.id) || {}), ...o };
    if (o.status !== 'cancelled' && ORD.get(o.id)?.status !== o.status) {
      // silent status update
    }
  }
  ORD.set(o.id, o); paint(o); badge();
  if (page === 'dashboard') stats();
}
function badge() {
  const n = [...ORD.values()].filter(o => o.status === 'pending').length;
  const b = document.querySelector('[data-p="orders"] [data-badge]');
  if (b) { b.textContent = n; b.classList.toggle('hide', !n); }
}
function setOpen(v) {
  isOpen = !!v;
}
$('snd').title = soundOn ? 'إيقاف الصوت' : 'تفعيل الصوت';

