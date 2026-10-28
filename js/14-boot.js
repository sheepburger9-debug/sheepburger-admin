/* ═══════════════════════════════════════════════════
   SECTION 14 · BOOT
   ═══════════════════════════════════════════════════ */
(async function boot() {
  if (!sb) {
    $('login').classList.remove('hidden');
    $('lerr').textContent = 'تعذر تحميل Supabase';
    return;
  }
  if (!configured) {
    $('login').classList.remove('hidden');
    $('lerr').textContent = 'أضف رابط Supabase';
    return;
  }
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      const u = await sb.auth.getUser();
      if (u.data.user) { await enter(u.data.user); return; }
    }
    $('login').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    $('login').classList.remove('hidden');
    $('lerr').textContent = 'تعذر الاتصال';
  }
})();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ME) {
    loadOrders().then(() => refreshIfSafe(page));
  }
});

